import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { encrypt } from '../common/crypto/secrets';

// Mirrors this project's own bcrypt cost (BCRYPT_COST = 12 in auth.service.ts)
// closely enough to produce real, verifiable hashes without a 12-round cost
// slowing the suite down — tests assert against bcrypt.compare, not the cost.
const hashSync = (plain: string) => bcrypt.hashSync(plain, 4);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    userProfiles: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    userRoles: { findFirst: jest.Mock; create: jest.Mock };
    rolePermissions: { findMany: jest.Mock };
    clinicians: { findUnique: jest.Mock };
    patients: { findUnique: jest.Mock };
    users: { create: jest.Mock };
    clientOrganizations: { findUnique: jest.Mock };
    impersonationSessions: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { sign: jest.Mock; verifyAsync: jest.Mock };
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    sadd: jest.Mock;
    srem: jest.Mock;
    smembers: jest.Mock;
  };

  const activeProfile = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'user-1',
    email: 'sarah@medibook.dev',
    password: hashSync('CorrectPassword1!'),
    first_name: 'Sarah',
    last_name: 'Manager',
    is_active: true,
    clinician_id: null,
    client_org_id: null,
    phone: '+919810000000',
    password_reset_token: null,
    password_reset_expires: null,
    role_id: 'role-manager',
    role: { name: 'manager' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      userProfiles: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      userRoles: { findFirst: jest.fn(), create: jest.fn() },
      // REQ049/REQ015 — defaults to no grants so every pre-existing test in
      // this file (none of which care about permissions) gets an empty
      // array rather than a crash on an unmocked call.
      rolePermissions: { findMany: jest.fn().mockResolvedValue([]) },
      clinicians: { findUnique: jest.fn() },
      patients: { findUnique: jest.fn() },
      users: { create: jest.fn() },
      // REQ012/PLAN021 — defaults to org-less (null) so every pre-existing
      // test in this file (none of which set client_org_id) keeps hitting
      // the "no org to check" short-circuit and never touches this mock.
      clientOrganizations: { findUnique: jest.fn().mockResolvedValue(null) },
      // REQ053 — startImpersonation/endImpersonation
      impersonationSessions: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token'), verifyAsync: jest.fn() };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('issues tokens and clears the lockout counter on correct credentials', async () => {
      redis.get.mockResolvedValueOnce(null); // lockout check: not locked out
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());

      const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      // No totp_enabled on the fixture -> always the AuthPayloadType branch.
      if (!('access_token' in result)) throw new Error('expected AuthPayloadType, got a TotpChallenge');
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.token_type).toBe('Bearer');
      expect(result.user.email).toBe('sarah@medibook.dev');
      expect(result.user.roles).toEqual([{ name: 'manager' }]);
      expect(redis.del).toHaveBeenCalledWith('auth:lockout:sarah@medibook.dev');
    });

    it('rejects a wrong password with the same generic message a nonexistent account gets (TC-AUTH-API-002/003)', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());

      await expect(
        service.login({ email: 'sarah@medibook.dev', password: 'WrongPassword!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@medibook.dev', password: 'WrongPassword!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('rejects login for a deactivated account even with the correct password', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ is_active: false }));

      await expect(
        service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('records a failed attempt on bad credentials', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());
      redis.incr.mockResolvedValueOnce(1);

      await expect(
        service.login({ email: 'sarah@medibook.dev', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redis.incr).toHaveBeenCalledWith('auth:lockout:sarah@medibook.dev');
      expect(redis.expire).toHaveBeenCalledWith('auth:lockout:sarah@medibook.dev', 15 * 60);
    });

    it("embeds the user's own client_org_id in the signed JWT payload, never a different tenant's (the entire cross-tenant boundary rests on this being correct — backend-hard-rules.md Rule 1)", async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(
        activeProfile({ client_org_id: 'org-tenant-a' }),
      );

      await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', client_org_id: 'org-tenant-a' }),
        expect.anything(),
      );
    });

    // REQ049/REQ015 (US-SEC-02) — the whole point of the guard is that it
    // reads this array, not the role name; if resolvePermissions() silently
    // resolved from the wrong role_id or dropped the join, the guard would
    // pass or fail every request for the wrong reason.
    it("resolves the caller's granted permissions from RolePermissions/Permissions and embeds them in the signed JWT", async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ role_id: 'role-manager' }));
      prisma.rolePermissions.findMany.mockResolvedValue([
        { permission: { name: 'roles.view' } },
        { permission: { name: 'roles.edit' } },
      ]);

      await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      expect(prisma.rolePermissions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role_id: 'role-manager', is_deleted: false }) }),
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: ['roles.view', 'roles.edit'] }),
        expect.anything(),
      );
    });

    it('embeds an empty permissions array for a role with zero RolePermissions rows, not undefined or every permission', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());
      prisma.rolePermissions.findMany.mockResolvedValue([]);

      await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ permissions: [] }), expect.anything());
    });

    it("embeds the caller's own patient_id/clinician_id in the signed JWT (TC-AUTH-UNIT-003) -- the entire patient/clinician self-scoping fix (TC-AUTH-API-008/009) rests on these being correct, not just present", async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(
        activeProfile({ patient_id: 'pat-42', clinician_id: 'cln-7' }),
      );

      await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ patient_id: 'pat-42', clinician_id: 'cln-7' }),
        expect.anything(),
      );
    });

    it("populates user.patient from patient_id, matching the existing user.clinician pattern -- pages/patient/Profile.jsx has no other way to learn its own caller's patient id", async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ patient_id: 'pat-42' }));
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-42', first_name: 'Priya', last_name: 'Sharma', is_deleted: false });

      const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
      expect(result.user.patient).toEqual({ id: 'pat-42', full_name: 'Priya Sharma' });
    });

    it('user.patient stays null for a role with no patient_id link', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile()); // default fixture: patient_id null

      const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
      expect(result.user.patient).toBeNull();
      expect(prisma.patients.findUnique).not.toHaveBeenCalled();
    });

    it('user.patient stays null when patient_id points to a soft-deleted patient record', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ patient_id: 'pat-42' }));
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-42', first_name: 'Priya', last_name: 'Sharma', is_deleted: true });

      const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
      expect(result.user.patient).toBeNull();
    });

    it('signs patient_id/clinician_id as null (not omitted/undefined) for a role linked to neither, so downstream selfScope() checks never accidentally skip themselves via a missing key', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile()); // default fixture: both null

      await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ patient_id: null, clinician_id: null }),
        expect.anything(),
      );
    });

    it('rejects outright once locked out, without ever touching the password (TC-AUTH-API-013)', async () => {
      redis.get.mockResolvedValueOnce('5'); // already at LOCKOUT_MAX_ATTEMPTS

      await expect(
        service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' }),
      ).rejects.toThrow('Account temporarily locked due to repeated failed attempts. Try again later.');

      expect(prisma.userProfiles.findUnique).not.toHaveBeenCalled();
    });

    // PLAN016 Slice C
    it('returns a TotpChallenge (not tokens) for a correct password when totp_enabled is true', async () => {
      redis.get.mockResolvedValueOnce(null);
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ totp_enabled: true }));

      const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });

      if (!('requires_totp' in result)) throw new Error('expected a TotpChallenge, got AuthPayloadType');
      expect(result.requires_totp).toBe(true);
      expect(result.challenge_token).toBe('signed.jwt.token');
      // The challenge JWT carries a distinct purpose claim, never the full session payload.
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', purpose: 'totp_challenge' }),
        expect.anything(),
      );
    });

    // REQ012/PLAN021 — "Require MFA for all staff" + "Auto-logout after idle"
    describe('security settings (mfa_setup_required / session_timeout_minutes)', () => {
      it('flags mfa_setup_required when the org requires it, the role is not patient, and TOTP is not enrolled', async () => {
        redis.get.mockResolvedValueOnce(null);
        prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ client_org_id: 'org-1' }));
        prisma.clientOrganizations.findUnique.mockResolvedValue({ mfa_required: true, session_timeout_minutes: null });

        const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });
        if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
        expect(result.mfa_setup_required).toBe(true);
      });

      it('does not flag mfa_setup_required when the org does not require it', async () => {
        redis.get.mockResolvedValueOnce(null);
        prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ client_org_id: 'org-1' }));
        prisma.clientOrganizations.findUnique.mockResolvedValue({ mfa_required: false, session_timeout_minutes: null });

        const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });
        if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
        expect(result.mfa_setup_required).toBe(false);
      });

      it('never flags mfa_setup_required for a patient role, even when the org requires MFA', async () => {
        redis.get.mockResolvedValueOnce(null);
        prisma.userProfiles.findUnique.mockResolvedValue(
          activeProfile({ client_org_id: 'org-1', role: { name: 'patient' } }),
        );
        prisma.clientOrganizations.findUnique.mockResolvedValue({ mfa_required: true, session_timeout_minutes: null });

        const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });
        if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
        expect(result.mfa_setup_required).toBe(false);
      });

      it('is false for an org-less caller, without querying clientOrganizations', async () => {
        redis.get.mockResolvedValueOnce(null);
        prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ client_org_id: null }));

        const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });
        if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
        expect(result.mfa_setup_required).toBe(false);
        expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
      });

      it('passes through the org\'s session_timeout_minutes for every role', async () => {
        redis.get.mockResolvedValueOnce(null);
        prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ client_org_id: 'org-1' }));
        prisma.clientOrganizations.findUnique.mockResolvedValue({ mfa_required: false, session_timeout_minutes: 30 });

        const result = await service.login({ email: 'sarah@medibook.dev', password: 'CorrectPassword1!' });
        if (!('access_token' in result)) throw new Error('expected AuthPayloadType');
        expect(result.session_timeout_minutes).toBe(30);
      });
    });
  });

  describe('verifyTotpLogin', () => {
    const totpSecret = authenticator.generateSecret();
    const backupCodePlain = 'abcd1234ef';

    const totpProfile = (overrides: Partial<Record<string, unknown>> = {}) =>
      activeProfile({
        totp_enabled: true,
        totp_secret_encrypted: encrypt(totpSecret),
        totp_backup_codes: [bcrypt.hashSync(backupCodePlain, 4)],
        ...overrides,
      });

    it('rejects an expired/invalid challenge token without touching Prisma', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.verifyTotpLogin('bad.token', '123456')).rejects.toThrow(
        'Login challenge has expired — please sign in again',
      );
      expect(prisma.userProfiles.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a token whose purpose claim is not the TOTP-challenge purpose', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'password_reset' });
      await expect(service.verifyTotpLogin('token', '123456')).rejects.toThrow('Invalid login challenge');
    });

    it('rejects when the account no longer has 2FA enabled (e.g. disabled mid-challenge)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'totp_challenge' });
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ totp_enabled: false }));
      await expect(service.verifyTotpLogin('token', '123456')).rejects.toThrow('Invalid login challenge');
    });

    it('issues real tokens for a correct current TOTP code', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'totp_challenge' });
      prisma.userProfiles.findUnique.mockResolvedValue(totpProfile());
      const code = authenticator.generate(totpSecret);

      const result = await service.verifyTotpLogin('token', code);

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('sarah@medibook.dev');
    });

    // REQ012/PLAN021 — an account that already completed the TOTP challenge
    // is, by definition, already enrolled -- mfa_setup_required must never
    // fire again even if the org requires MFA.
    it('never flags mfa_setup_required for an account that just cleared the TOTP challenge', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'totp_challenge' });
      prisma.userProfiles.findUnique.mockResolvedValue(totpProfile({ client_org_id: 'org-1' }));
      prisma.clientOrganizations.findUnique.mockResolvedValue({ mfa_required: true, session_timeout_minutes: null });
      const code = authenticator.generate(totpSecret);

      const result = await service.verifyTotpLogin('token', code);
      expect(result.mfa_setup_required).toBe(false);
    });

    it('accepts a correct backup code and consumes it (single-use), when the TOTP code itself is wrong', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'totp_challenge' });
      prisma.userProfiles.findUnique.mockResolvedValue(totpProfile());

      const result = await service.verifyTotpLogin('token', backupCodePlain);

      expect(result.access_token).toBe('signed.jwt.token');
      expect(prisma.userProfiles.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totp_backup_codes: [] }, // the one-and-only backup code was removed
      });
    });

    it('rejects a code that matches neither the current TOTP nor any backup code', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', purpose: 'totp_challenge' });
      prisma.userProfiles.findUnique.mockResolvedValue(totpProfile());

      await expect(service.verifyTotpLogin('token', '000000')).rejects.toThrow('Incorrect code');
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('derives the profile from the JWT subject only — no id argument exists on the method', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());
      const result = await service.me('user-1');
      expect(prisma.userProfiles.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { role: true },
      });
      expect(result.email).toBe('sarah@medibook.dev');
    });

    it('throws for a missing or deactivated profile', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      await expect(service.me('ghost')).rejects.toThrow(UnauthorizedException);

      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile({ is_active: false }));
      await expect(service.me('user-1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('rejects an already-registered email with a generic conflict message', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());
      await expect(
        service.register({
          email: 'sarah@medibook.dev',
          password: 'NewPassword1!',
          first_name: 'Sarah',
          last_name: 'Manager',
          phone: '+919810000000',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('reuses the existing system "patient" role instead of creating a duplicate', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.userRoles.findFirst.mockResolvedValue({ id: 'role-patient', name: 'patient' });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          users: { create: jest.fn().mockResolvedValue({ id: 'new-user' }) },
          userProfiles: {
            create: jest.fn().mockResolvedValue(activeProfile({ id: 'new-user', role: { name: 'patient' } })),
          },
        }),
      );

      await service.register({
        email: 'new@medibook.dev',
        password: 'NewPassword1!',
        first_name: 'New',
        last_name: 'Patient',
        phone: '+919810000001',
      });

      expect(prisma.userRoles.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rejects an invalid or already-rotated token (replay-detection guarantee, TC-AUTH-UNIT-005)', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.refresh({ refresh_token: 'stale-or-fake' })).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('deletes the old token before issuing a new one — rotation, not reuse', async () => {
      redis.get.mockResolvedValueOnce('user-1');
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());

      await service.refresh({ refresh_token: 'valid-token' });

      expect(redis.del).toHaveBeenCalledWith('auth:refresh:valid-token');
      expect(redis.srem).toHaveBeenCalledWith('auth:user:user-1:refresh_tokens', 'valid-token');
    });
  });

  describe('logout', () => {
    it('revokes every refresh token issued to the user, not just one', async () => {
      redis.smembers.mockResolvedValueOnce(['token-a', 'token-b']);

      const result = await service.logout('user-1');

      expect(redis.del).toHaveBeenCalledWith('auth:refresh:token-a', 'auth:refresh:token-b');
      expect(redis.del).toHaveBeenCalledWith('auth:user:user-1:refresh_tokens');
      expect(result).toEqual({ success: true });
    });
  });

  describe('requestOtp', () => {
    it('returns the same success response for a registered and an unregistered phone (TC-AUTH-API-011)', async () => {
      prisma.userProfiles.findUnique.mockResolvedValueOnce(activeProfile());
      const registered = await service.requestOtp('+919810000000');

      prisma.userProfiles.findUnique.mockResolvedValueOnce(null);
      const unregistered = await service.requestOtp('+919999999999');

      expect(registered).toEqual({ success: true });
      expect(unregistered).toEqual({ success: true });
      // Only the registered phone actually got an OTP written to Redis.
      expect(redis.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyOtp', () => {
    it('rejects when no OTP was ever requested', async () => {
      redis.get.mockResolvedValue(null);
      await expect(service.verifyOtp('+919810000000', '123456')).rejects.toThrow('OTP expired or not requested');
    });

    it('locks out after the max wrong-attempt count (TC-AUTH-UNIT-008)', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ code: '654321', attempts: 2 })); // one below the max
      await expect(service.verifyOtp('+919810000000', '000000')).rejects.toThrow(
        'Too many incorrect attempts. Please request a new code.',
      );
      expect(redis.del).toHaveBeenCalledWith('auth:otp:+919810000000');
    });

    it('issues tokens on the correct code and burns the OTP', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ code: '654321', attempts: 0 }));
      prisma.userProfiles.findUnique.mockResolvedValue(activeProfile());

      const result = await service.verifyOtp('+919810000000', '654321');

      expect(redis.del).toHaveBeenCalledWith('auth:otp:+919810000000');
      expect(result.access_token).toBe('signed.jwt.token');
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('forgotPassword returns success without revealing whether the email exists', async () => {
      prisma.userProfiles.findUnique.mockResolvedValueOnce(null);
      await expect(service.forgotPassword('ghost@medibook.dev')).resolves.toEqual({ success: true });
    });

    it('resetPassword rejects an invalid or expired token', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'NewPassword1!')).rejects.toThrow(BadRequestException);
    });

    it('resetPassword clears the token after a successful reset (single use)', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(activeProfile());
      await service.resetPassword('good-token', 'NewPassword1!');

      expect(prisma.userProfiles.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password_reset_token: null, password_reset_expires: null }),
        }),
      );
    });
  });

  // REQ053 (US-SEC-06)
  describe('startImpersonation / endImpersonation', () => {
    const actor = { sub: 'admin-1', roles: ['admin'], client_org_id: 'org-a' } as any;
    const target = activeProfile({ id: 'target-1', client_org_id: 'org-a', role: { name: 'staff' } });

    it('rejects a blank reason', async () => {
      const result = await service.startImpersonation(actor, 'target-1', '   ');
      expect(result.success).toBe(false);
      expect(prisma.impersonationSessions.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent target', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      const result = await service.startImpersonation(actor, 'ghost', 'debugging an issue');
      expect(result.success).toBe(false);
    });

    // `startImpersonation` is @Auth('admin', 'super_admin')-gated (auth.resolver.ts),
    // and both those roles are unconditionally platform-wide by this
    // codebase's own design (isPlatformOperator() — see tenant-scope.ts and
    // CLAUDE.md's own "the scoping bug has four spellings" note on why this
    // is intentional, not a bug). isSameOrg()'s cross-org check is therefore
    // correctly unreachable for the actor role set this mutation actually
    // admits — a platform-wide admin genuinely CAN impersonate a user in
    // any org, matching every other admin-gated read in this codebase. The
    // check stays in the code as a real, meaningful guard for the day this
    // gate is ever widened to include an org-scoped role like 'manager'
    // (same precedent as the webhooks/api-keys fix documented in CLAUDE.md).
    it('a platform-wide admin can impersonate a user in a different org (intentional — matches isPlatformOperator design)', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue({ ...target, client_org_id: 'org-b' });
      const result = await service.startImpersonation(actor, 'target-1', 'debugging an issue');
      expect(result.success).toBe(true);
      expect(prisma.impersonationSessions.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ client_org_id: 'org-b' }),
      }));
    });

    it('rejects impersonation for an org-scoped (non-platform-wide) actor calling into a different org', async () => {
      // A hypothetical future caller if this gate is ever widened past
      // admin/super_admin — proves isSameOrg()'s check is real, not dead
      // code, for any role that actually has an org boundary to enforce.
      const orgScopedActor = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a' } as any;
      prisma.userProfiles.findUnique.mockResolvedValue({ ...target, client_org_id: 'org-b' });
      const result = await service.startImpersonation(orgScopedActor, 'target-1', 'debugging an issue');
      expect(result.success).toBe(false);
      expect(prisma.impersonationSessions.create).not.toHaveBeenCalled();
    });

    it('rejects impersonating yourself', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue({ ...target, id: 'admin-1' });
      const result = await service.startImpersonation(actor, 'admin-1', 'debugging an issue');
      expect(result.success).toBe(false);
    });

    it('mints a token with sub set to the target and real_actor_id set to the actor', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(target);
      const result = await service.startImpersonation(actor, 'target-1', 'debugging an issue');
      expect(result.success).toBe(true);
      expect(result.access_token).toBe('signed.jwt.token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'target-1', roles: ['staff'], real_actor_id: 'admin-1' }),
        expect.objectContaining({ expiresIn: 30 * 60 }),
      );
      expect(prisma.impersonationSessions.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ real_actor_user_id: 'admin-1', target_user_id: 'target-1', client_org_id: 'org-a' }),
      }));
    });

    it('endImpersonation is a no-op for a non-impersonating caller', async () => {
      const result = await service.endImpersonation({ sub: 'user-1' } as any);
      expect(result.success).toBe(false);
      expect(prisma.impersonationSessions.update).not.toHaveBeenCalled();
    });

    it('endImpersonation marks the active session ended', async () => {
      prisma.impersonationSessions.findFirst.mockResolvedValue({ id: 'sess-1' });
      const impersonatedCaller = { sub: 'target-1', real_actor_id: 'admin-1' } as any;
      const result = await service.endImpersonation(impersonatedCaller);
      expect(result.success).toBe(true);
      expect(prisma.impersonationSessions.update).toHaveBeenCalledWith({ where: { id: 'sess-1' }, data: { ended_at: expect.any(Date) } });
    });
  });
});
