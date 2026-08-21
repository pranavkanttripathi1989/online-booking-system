import { Inject, Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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

const BCRYPT_COST = 12;
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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

    return {
      id: userProfile.id,
      email: userProfile.email,
      name: `${userProfile.first_name} ${userProfile.last_name}`,
      roles: [{ name: userProfile.role.name }],
      clinician,
      client_org_id: userProfile.client_org_id ?? undefined,
    };
  }

  private async issueTokens(
    userProfile: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: { name: string };
      clinician_id: string | null;
      client_org_id: string | null;
      patient_id?: string | null;
    },
    userAgent?: string,
  ): Promise<AuthPayloadType> {
    const payload = {
      sub: userProfile.id,
      roles: [userProfile.role.name],
      client_org_id: userProfile.client_org_id,
      patient_id: userProfile.patient_id ?? null,
      clinician_id: userProfile.clinician_id ?? null,
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

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_SECONDS,
      user: await this.buildAuthUser(userProfile),
    };
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
      // OTP provider (MSG91/Gupshup) integration is stubbed until a real
      // account exists — logged server-side only, never returned to the client.
      // eslint-disable-next-line no-console
      console.log(`[OTP STUB] Would send ${code} to ${phone} via MSG91/Gupshup`);
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
