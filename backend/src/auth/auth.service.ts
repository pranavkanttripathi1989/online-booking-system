import { Inject, Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { RefreshInput } from './dto/refresh.input';
import { AuthPayloadType, TotpChallengeType } from './entities/auth-payload.entity';
import { decrypt } from '../common/crypto/secrets';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';
import { JwtPayload } from './strategies/jwt.strategy';
import { isSameOrg } from '../common/scoping/tenant-scope';
import { NotificationProviderConfigService } from '../notifications/notification-provider-config.service';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
// REQ053 (US-SEC-06) — the PRD's own break-glass default (US-SEC-05, "30
// minutes"), reused here since US-SEC-06 doesn't specify its own duration.
const IMPERSONATION_TTL_SECONDS = 30 * 60;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const RESET_TOKEN_TTL_MINUTES = 30;
const TOTP_CHALLENGE_TTL_SECONDS = 5 * 60;
const TOTP_CHALLENGE_PURPOSE = 'totp_challenge';

// TC-AUTH-API-002/003: dummy hash so a nonexistent-email login takes the same
// bcrypt-compare time as a real one — closes the user-enumeration timing side-channel.
const DUMMY_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8O.HKz7YvXTLYnDDlYX/XR9C1Kh4Sy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly providerConfigService: NotificationProviderConfigService,
  ) {}

  // ── Password / lockout helpers ────────────────────────────────────────────

  private lockoutKey(email: string) {
    return `auth:lockout:${email.toLowerCase()}`;
  }

  private async isLockedOut(email: string): Promise<boolean> {
    const attempts = await this.redis.get(this.lockoutKey(email));
    return Number(attempts ?? 0) >= LOCKOUT_MAX_ATTEMPTS;
  }

  private async recordFailedAttempt(email: string): Promise<void> {
    const key = this.lockoutKey(email);
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, LOCKOUT_WINDOW_SECONDS);
    }
  }

  private async clearFailedAttempts(email: string): Promise<void> {
    await this.redis.del(this.lockoutKey(email));
  }

  // ── Token issuance ─────────────────────────────────────────────────────────

  private userRefreshSetKey(userId: string) {
    return `auth:user:${userId}:refresh_tokens`;
  }

  // REQ049/REQ015 (US-SEC-02) — resolved once per login/refresh, embedded in
  // the JWT (common/guards/permissions.guard.ts reads it from there, never
  // re-queries this table per-request). A role with no RolePermissions rows
  // at all (every non-system, not-yet-configured custom role) correctly
  // resolves to an empty list, not "every permission" -- there is no
  // ternary here to get backwards the way the client_org_id one was (F-01).
  private async resolvePermissions(roleId: string): Promise<string[]> {
    const grants = await this.prisma.rolePermissions.findMany({
      where: { role_id: roleId, is_deleted: false },
      include: { permission: true },
    });
    return grants.map((g) => g.permission.name);
  }

  // Builds the exact `user { ... }` shape frontend/src/graphql/mutations.js's
  // LOGIN_MUTATION requests — including the nested clinician/clinician_type
  // object, which doesn't map to a real FK yet (see user.entity.ts comment).
  private async buildAuthUser(userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: { name: string };
    clinician_id: string | null;
    patient_id?: string | null;
    client_org_id: string | null;
  }) {
    let clinician: AuthPayloadType['user']['clinician'] = null;
    if (userProfile.clinician_id) {
      const record = await this.prisma.clinicians.findUnique({ where: { id: userProfile.clinician_id } });
      if (record) {
        clinician = {
          id: record.id,
          full_name: `${record.first_name} ${record.last_name}`,
          avatar_url: undefined,
          clinician_type: { id: record.clinician_type, name: record.clinician_type },
        };
      }
    }

    let patient: { id: string; full_name: string } | null = null;
    if (userProfile.patient_id) {
      const record = await this.prisma.patients.findUnique({ where: { id: userProfile.patient_id } });
      if (record && !record.is_deleted) {
        patient = { id: record.id, full_name: `${record.first_name} ${record.last_name}` };
      }
    }

    return {
      id: userProfile.id,
      email: userProfile.email,
      name: `${userProfile.first_name} ${userProfile.last_name}`,
      roles: [{ name: userProfile.role.name }],
      clinician,
      patient,
      client_org_id: userProfile.client_org_id ?? undefined,
    };
  }

  // REQ012/PLAN021 — one org lookup backing both security-setting fields on
  // AuthPayloadType. mfa_setup_required is true only when the org has the
  // setting on, the caller isn't a patient, and they haven't enrolled in
  // TOTP yet (never throws/blocks -- see the entity field comment for why
  // login still succeeds either way). session_timeout_minutes is passed
  // through as-is for every role, since the frontend's idle timer applies
  // regardless of who's logged in.
  private async loadSecurityFields(userProfile: {
    role: { name: string };
    client_org_id: string | null;
    totp_enabled?: boolean;
  }): Promise<{ mfa_setup_required: boolean; session_timeout_minutes?: number }> {
    if (!userProfile.client_org_id) return { mfa_setup_required: false };
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: userProfile.client_org_id } });
    if (!org) return { mfa_setup_required: false };
    const mfaSetupRequired = org.mfa_required && userProfile.role.name !== 'patient' && !userProfile.totp_enabled;
    return { mfa_setup_required: mfaSetupRequired, session_timeout_minutes: org.session_timeout_minutes ?? undefined };
  }

  private async issueTokens(
    userProfile: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role_id: string;
      role: { name: string };
      clinician_id: string | null;
      client_org_id: string | null;
      patient_id?: string | null;
      totp_enabled?: boolean;
    },
    userAgent?: string,
  ): Promise<AuthPayloadType> {
    const permissions = await this.resolvePermissions(userProfile.role_id);
    const payload = {
      sub: userProfile.id,
      roles: [userProfile.role.name],
      client_org_id: userProfile.client_org_id,
      patient_id: userProfile.patient_id ?? null,
      clinician_id: userProfile.clinician_id ?? null,
      permissions,
    };
    const access_token = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TTL_SECONDS,
    });

    const refresh_token = crypto.randomBytes(48).toString('hex');
    await this.redis.set(
      `auth:refresh:${refresh_token}`,
      userProfile.id,
      'EX',
      REFRESH_TTL_SECONDS,
    );
    // Tracked per-user so `logout` can revoke every active session for this
    // account without the frontend needing to hold onto its refresh token
    // (LOGOUT_MUTATION currently takes no arguments at all).
    const setKey = this.userRefreshSetKey(userProfile.id);
    await this.redis.sadd(setKey, refresh_token);
    await this.redis.expire(setKey, REFRESH_TTL_SECONDS);

    // Additive-only: purely for account/account.service.ts's mySessions/
    // revokeMySession. Never read here, so omitting userAgent (the default
    // for any call site that doesn't pass one) leaves every other existing
    // auth flow byte-for-byte unchanged.
    if (userAgent) {
      await this.redis.set(
        `auth:refresh_meta:${refresh_token}`,
        JSON.stringify({ user_agent: userAgent, created_at: new Date().toISOString() }),
        'EX',
        REFRESH_TTL_SECONDS,
      );
    }

    const securityFields = await this.loadSecurityFields(userProfile);
    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_SECONDS,
      user: await this.buildAuthUser(userProfile),
      ...securityFields,
    };
  }

  // ── Impersonation (REQ053, US-SEC-06 scoped down — see the requirement
  // doc's own note on the deferred Support-Agent/org-approval layer) ────────

  async startImpersonation(actor: JwtPayload, targetUserId: string, reason: string) {
    if (!reason?.trim()) {
      return { success: false, userErrors: [{ message: 'A reason is required' }] };
    }
    const target = await this.prisma.userProfiles.findUnique({ where: { id: targetUserId }, include: { role: true } });
    if (!target || target.is_deleted) {
      return { success: false, userErrors: [{ message: 'User not found' }] };
    }
    if (!isSameOrg(actor, target.client_org_id)) {
      return { success: false, userErrors: [{ message: 'User not found' }] };
    }
    if (target.id === actor.sub) {
      return { success: false, userErrors: [{ message: 'Cannot impersonate yourself' }] };
    }
    // A platform-wide actor (client_org_id: null) impersonating a target in
    // a real org anchors the session to the TARGET's org -- there is no
    // other tenant to attribute it to. If NEITHER has an org (an org-less
    // target, e.g. a self-registered account with no linkage yet), there is
    // no tenant to anchor the session to at all -- fail closed rather than
    // write a null client_org_id.
    const sessionOrgId = target.client_org_id ?? actor.client_org_id;
    if (!sessionOrgId) {
      return { success: false, userErrors: [{ message: 'Cannot impersonate a user with no organization' }] };
    }

    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_SECONDS * 1000);
    await this.prisma.impersonationSessions.create({
      data: {
        client_org_id: sessionOrgId,
        real_actor_user_id: actor.sub,
        target_user_id: target.id,
        reason,
        expires_at: expiresAt,
      },
    });

    const permissions = await this.resolvePermissions(target.role_id);
    const access_token = this.jwt.sign(
      {
        sub: target.id,
        roles: [target.role.name],
        client_org_id: target.client_org_id,
        patient_id: target.patient_id ?? null,
        clinician_id: target.clinician_id ?? null,
        permissions,
        real_actor_id: actor.sub,
      },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: IMPERSONATION_TTL_SECONDS },
    );
    return { success: true, userErrors: [], access_token, expires_in: IMPERSONATION_TTL_SECONDS };
  }

  // Marks the session ended for audit/administrative purposes. The access
  // token itself remains technically valid until its own expiry -- this
  // codebase has no early-revocation mechanism for short-lived access
  // tokens anywhere else either (logout only invalidates refresh tokens via
  // Redis); automatic reversion is guaranteed by expiresIn regardless.
  async endImpersonation(actor: JwtPayload) {
    if (!actor.real_actor_id) {
      return { success: false, userErrors: [{ message: 'Not currently impersonating' }] };
    }
    const session = await this.prisma.impersonationSessions.findFirst({
      where: { real_actor_user_id: actor.real_actor_id, target_user_id: actor.sub, ended_at: null },
      orderBy: { started_at: 'desc' },
    });
    if (session) {
      await this.prisma.impersonationSessions.update({ where: { id: session.id }, data: { ended_at: new Date() } });
    }

    // P1-02/SEC-2 — the impersonation access-token cookie replaced the real
    // actor's own cookie for the session's duration (auth.resolver.ts's
    // startImpersonation handler); ending it must hand back a real session,
    // not merely close the impersonation record, or the real actor is
    // logged out outright. Reissues a full, freshly-rotated token pair by
    // profile id — the same issueTokens() every other login path uses —
    // rather than asking the frontend to have remembered the real actor's
    // pre-impersonation token in JS, which is exactly the pattern this
    // slice's cookie migration exists to remove.
    // _tokens is deliberately not a GraphQL @Field — Nest's code-first
    // schema only reflects decorated fields, so this never reaches the
    // response body; auth.resolver.ts reads it server-side only, to set
    // cookies, the same "never hand the raw token to JS" discipline login/
    // refresh/etc. now follow too.
    const realActorProfile = await this.prisma.userProfiles.findUnique({
      where: { id: actor.real_actor_id },
      include: { role: true },
    });
    if (!realActorProfile || realActorProfile.is_deleted) {
      return { success: false, userErrors: [{ message: 'Your account is no longer available' }] };
    }
    const tokens = await this.issueTokens(realActorProfile);
    return { success: true, userErrors: [], _tokens: tokens };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(input: LoginInput, userAgent?: string): Promise<AuthPayloadType | TotpChallengeType> {
    // TC-AUTH-API-013: reject before touching the password at all once locked.
    if (await this.isLockedOut(input.email)) {
      throw new UnauthorizedException('Account temporarily locked due to repeated failed attempts. Try again later.');
    }

    const profile = await this.prisma.userProfiles.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { role: true },
    });

    // TC-AUTH-API-002/003: identical generic error + timing profile whether
    // the account exists or not.
    const hashToCompare = profile?.password ?? DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(input.password, hashToCompare);

    if (!profile || !passwordMatches || !profile.is_active) {
      await this.recordFailedAttempt(input.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.clearFailedAttempts(input.email);

    // PLAN016 Slice C — password verified, but full tokens are withheld
    // until a real TOTP/backup code clears verifyTotpLogin. The challenge
    // token proves "already passed password check" without being a usable
    // session credential itself (short TTL, distinct `purpose` claim, and
    // verifyTotpLogin is the only thing that accepts it).
    if (profile.totp_enabled) {
      const challenge_token = this.jwt.sign(
        { sub: profile.id, purpose: TOTP_CHALLENGE_PURPOSE },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: TOTP_CHALLENGE_TTL_SECONDS },
      );
      return { requires_totp: true, challenge_token };
    }

    return this.issueTokens(profile, userAgent);
  }

  async verifyTotpLogin(challengeToken: string, code: string, userAgent?: string): Promise<AuthPayloadType> {
    let claims: { sub: string; purpose: string };
    try {
      claims = await this.jwt.verifyAsync(challengeToken, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('Login challenge has expired — please sign in again');
    }
    if (claims.purpose !== TOTP_CHALLENGE_PURPOSE) {
      throw new UnauthorizedException('Invalid login challenge');
    }

    const profile = await this.prisma.userProfiles.findUnique({ where: { id: claims.sub }, include: { role: true } });
    if (!profile?.totp_enabled || !profile.totp_secret_encrypted || !profile.is_active) {
      throw new UnauthorizedException('Invalid login challenge');
    }

    const secret = decrypt(profile.totp_secret_encrypted);
    if (authenticator.check(code, secret)) {
      return this.issueTokens(profile, userAgent);
    }

    // Not a valid TOTP code -- try it as a single-use backup code instead.
    // Checked in parallel, not a sequential await loop: up to 10 real
    // bcrypt.compare calls at the service's BCRYPT_COST (12) is slow enough
    // sequentially (seconds) to risk tripping the frontend's own 10s
    // request-abort timeout (apollo/client.js) on a genuinely wrong code --
    // found via a real, reproducible e2e timeout, not a hypothetical.
    const backupCodes = (profile.totp_backup_codes as string[] | null) ?? [];
    const matches = await Promise.all(backupCodes.map((hash) => bcrypt.compare(code, hash)));
    const matchIndex = matches.indexOf(true);
    if (matchIndex !== -1) {
      const remaining = [...backupCodes.slice(0, matchIndex), ...backupCodes.slice(matchIndex + 1)];
      await this.prisma.userProfiles.update({ where: { id: profile.id }, data: { totp_backup_codes: remaining } });
      return this.issueTokens(profile, userAgent);
    }

    throw new UnauthorizedException('Incorrect code');
  }

  // ── Me ─────────────────────────────────────────────────────────────────────

  async me(userId: string) {
    // TC-AUTH-API-005: derives exclusively from the JWT subject, never a
    // client-supplied id — there is deliberately no id argument on this method.
    const profile = await this.prisma.userProfiles.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!profile || !profile.is_active) {
      throw new UnauthorizedException();
    }
    return this.buildAuthUser(profile);
  }

  // ── Register ───────────────────────────────────────────────────────────────

  async register(input: RegisterInput, userAgent?: string): Promise<AuthPayloadType> {
    const existing = await this.prisma.userProfiles.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      // Deliberately still generic — avoids confirming the email exists any
      // more precisely than "you can't register with this one."
      throw new ConflictException('Unable to create account with these details');
    }

    // Prisma's compound-unique `where` doesn't accept `null` for a nullable
    // field in this version, so this is a manual findFirst+create instead of upsert.
    const existingPatientRole = await this.prisma.userRoles.findFirst({
      where: { client_org_id: null, name: 'patient' },
    });
    const patientRole =
      existingPatientRole ??
      (await this.prisma.userRoles.create({
        data: { name: 'patient', description: 'Self-registered patient account', is_system: true },
      }));

    const hashed = await bcrypt.hash(input.password, BCRYPT_COST);

    const profile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({ data: {} });
      return tx.userProfiles.create({
        data: {
          id: user.id,
          email: input.email.toLowerCase(),
          password: hashed,
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
          role_id: patientRole.id,
        },
        include: { role: true },
      });
    });

    return this.issueTokens(profile, userAgent);
  }

  // ── Refresh (rotation) ──────────────────────────────────────────────────────

  async refresh(input: RefreshInput, userAgent?: string): Promise<AuthPayloadType> {
    // P1-02/SEC-2 — the resolver resolves input.refresh_token OR the
    // mb_refresh_token cookie before calling this; still guarded here too
    // since this service method has its own direct unit-test coverage and
    // must not silently look up `auth:refresh:undefined` if ever called
    // with neither.
    if (!input.refresh_token) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const key = `auth:refresh:${input.refresh_token}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      // TC-AUTH-UNIT-005: reusing an already-rotated (or invalid) refresh
      // token is rejected outright — this is the replay-detection guarantee.
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // Rotate: the old token is dead the instant it's used, whether or not
    // the rest of this call succeeds.
    await this.redis.del(key);
    await this.redis.srem(this.userRefreshSetKey(userId), input.refresh_token);

    const profile = await this.prisma.userProfiles.findUnique({ where: { id: userId }, include: { role: true } });
    if (!profile || !profile.is_active) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(profile, userAgent);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ success: boolean }> {
    // TC-AUTH-API-006: server-side revocation, not just a frontend clearStore().
    // LOGOUT_MUTATION takes no arguments (frontend/src/graphql/mutations.js),
    // so this revokes every refresh token issued to the authenticated user
    // rather than requiring the frontend to hold onto and pass one back.
    const setKey = this.userRefreshSetKey(userId);
    const tokens = await this.redis.smembers(setKey);
    if (tokens.length > 0) {
      await this.redis.del(...tokens.map((t) => `auth:refresh:${t}`));
    }
    await this.redis.del(setKey);
    return { success: true };
  }

  // ── OTP ──────────────────────────────────────────────────────────────────

  async requestOtp(phone: string): Promise<{ success: boolean }> {
    // TC-AUTH-API-011: identical response whether the phone is registered or
    // not — avoids leaking account existence over the OTP channel too.
    const profile = await this.prisma.userProfiles.findUnique({ where: { phone } });
    if (profile) {
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
      await this.redis.set(
        `auth:otp:${phone}`,
        JSON.stringify({ code, attempts: 0 }),
        'EX',
        OTP_TTL_SECONDS,
      );
      // REQ114 — the org's own configured SMS provider (REQ008's registry),
      // the same getActiveConfigForOrg/provider.send() shape sendSms()/
      // sharePrescriptionViaWhatsapp() already use. A genuinely org-less
      // profile (client_org_id: null — e.g. a platform operator) has no
      // provider to resolve and is skipped silently, same as those two
      // callers' own "no phone or org, skip" convention. A send failure is
      // logged but never surfaced to the caller — TC-AUTH-API-011's
      // identical-response guarantee must hold regardless of delivery
      // outcome, not just registration status.
      if (profile.client_org_id) {
        const config = await this.providerConfigService.getActiveConfigForOrg(profile.client_org_id, 'sms');
        if (config) {
          const result = await config.provider.send(
            config.credentials,
            phone,
            `Your MediBook verification code is ${code}. It expires in ${Math.round(OTP_TTL_SECONDS / 60)} minutes.`,
          );
          if (!result.sent) {
            this.logger.warn(`OTP SMS send failed for ${phone}: ${result.error}`);
          }
        }
      }
    }
    return { success: true };
  }

  async verifyOtp(phone: string, code: string, userAgent?: string): Promise<AuthPayloadType> {
    const key = `auth:otp:${phone}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('OTP expired or not requested');
    }

    const state = JSON.parse(raw) as { code: string; attempts: number };
    if (state.code !== code) {
      state.attempts += 1;
      // TC-AUTH-UNIT-008: invalidate after 3 wrong attempts, forcing a fresh OTP request.
      if (state.attempts >= OTP_MAX_ATTEMPTS) {
        await this.redis.del(key);
        throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
      }
      await this.redis.set(key, JSON.stringify(state), 'KEEPTTL');
      throw new UnauthorizedException('Incorrect code');
    }

    await this.redis.del(key);
    const profile = await this.prisma.userProfiles.findUnique({ where: { phone }, include: { role: true } });
    if (!profile || !profile.is_active) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(profile, userAgent);
  }

  // ── Forgot / reset password ─────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const profile = await this.prisma.userProfiles.findUnique({ where: { email: email.toLowerCase() } });
    // TC-AUTH-API-002/003 pattern applied here too: same success response either way.
    if (profile) {
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      await this.prisma.userProfiles.update({
        where: { id: profile.id },
        data: {
          password_reset_token: hashedToken,
          password_reset_expires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
        },
      });
      // Real send goes through the Email Service (AWS SES) once built —
      // stubbed to a server log for this increment.
      // eslint-disable-next-line no-console
      console.log(`[EMAIL STUB] Password reset token for ${email}: ${token}`);
    }
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const profile = await this.prisma.userProfiles.findFirst({
      where: { password_reset_token: hashedToken, password_reset_expires: { gt: new Date() } },
    });
    if (!profile) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hashed = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.userProfiles.update({
      where: { id: profile.id },
      data: { password: hashed, password_reset_token: null, password_reset_expires: null },
    });
    return { success: true };
  }
}
