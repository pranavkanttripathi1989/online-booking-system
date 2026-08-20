import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const hashSync = (plain: string) => bcrypt.hashSync(plain, 4);

describe('AccountService', () => {
  let service: AccountService;
  let prisma: { userProfiles: { findUnique: jest.Mock; update: jest.Mock } };
  let redis: { smembers: jest.Mock; get: jest.Mock; del: jest.Mock; srem: jest.Mock };
  let authService: { logout: jest.Mock };

  const user: JwtPayload = { sub: 'user-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const otherUser: JwtPayload = { sub: 'user-2', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const profileRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'user-1',
    first_name: 'Sarah',
    last_name: 'Manager',
    email: 'sarah@medibook.dev',
    phone: '+919810000000',
    password: hashSync('CorrectPassword1!'),
    is_deleted: false,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = { userProfiles: { findUnique: jest.fn(), update: jest.fn() } };
    redis = { smembers: jest.fn(), get: jest.fn(), del: jest.fn(), srem: jest.fn() };
    authService = { logout: jest.fn().mockResolvedValue({ success: true }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();
    service = module.get(AccountService);
  });

  describe('myProfile / updateMyProfile', () => {
    it('derives the profile exclusively from the JWT subject, never a client-supplied id', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow());
      await service.myProfile(user);
      expect(prisma.userProfiles.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('returns null for a deleted profile rather than leaking it', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow({ is_deleted: true }));
      expect(await service.myProfile(user)).toBeNull();
    });

    it('rejects updating to a phone number already owned by someone else', async () => {
      prisma.userProfiles.findUnique
        .mockResolvedValueOnce(profileRow())
        .mockResolvedValueOnce({ id: 'user-2', phone: '+919999999999' });
      const result = await service.updateMyProfile({ phone: '+919999999999' } as any, user);
      expect(result.success).toBe(false);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });

    it('allows keeping your own existing phone number unchanged', async () => {
      prisma.userProfiles.findUnique.mockResolvedValueOnce(profileRow());
      prisma.userProfiles.update.mockResolvedValue(profileRow({ first_name: 'Sarah J' }));
      const result = await service.updateMyProfile({ phone: '+919810000000', first_name: 'Sarah J' } as any, user);
      expect(result.success).toBe(true);
    });

    it('updates first/last name and phone on the caller\'s own row only', async () => {
      prisma.userProfiles.findUnique.mockResolvedValueOnce(profileRow());
      prisma.userProfiles.update.mockResolvedValue(profileRow({ first_name: 'New' }));
      const result = await service.updateMyProfile({ first_name: 'New' } as any, user);
      expect(result.success).toBe(true);
      expect(prisma.userProfiles.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });

  describe('changeMyPassword', () => {
    it('rejects a wrong current password', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow());
      const result = await service.changeMyPassword(
        { current_password: 'WrongPassword1!', new_password: 'NewPassword2!' } as any,
        user,
      );
      expect(result.success).toBe(false);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });

    it('hashes and stores the new password on a correct current password', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow());
      prisma.userProfiles.update.mockResolvedValue(profileRow());
      const result = await service.changeMyPassword(
        { current_password: 'CorrectPassword1!', new_password: 'NewPassword2!' } as any,
        user,
      );
      expect(result.success).toBe(true);
      const updateCall = prisma.userProfiles.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'user-1' });
      expect(updateCall.data.password).not.toBe('NewPassword2!');
      expect(await bcrypt.compare('NewPassword2!', updateCall.data.password)).toBe(true);
    });
  });

  describe('mySessions / revokeMySession — self-scoping', () => {
    it('only reads the caller\'s own session set, never another user\'s', async () => {
      redis.smembers.mockResolvedValue([]);
      await service.mySessions(user);
      expect(redis.smembers).toHaveBeenCalledWith('auth:user:user-1:refresh_tokens');
    });

    it('marks a session with no recorded metadata as unknown rather than fabricating device/time', async () => {
      redis.smembers.mockResolvedValue(['token-a']);
      redis.get.mockResolvedValue(null);
      const [session] = await service.mySessions(user);
      expect(session.device).toBeUndefined();
      expect(session.created_at).toBeUndefined();
    });

    it('returns real device/created_at when metadata exists', async () => {
      redis.smembers.mockResolvedValue(['token-a']);
      redis.get.mockResolvedValue(JSON.stringify({ user_agent: 'Chrome/1.0', created_at: '2026-08-20T00:00:00.000Z' }));
      const [session] = await service.mySessions(user);
      expect(session.device).toBe('Chrome/1.0');
      expect(session.created_at?.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    });

    it('rejects revoking a session fingerprint that does not belong to the caller (cross-user attempt)', async () => {
      // otherUser's real token never appears in `user`'s own smembers result --
      // simulating user-1 trying to guess/replay user-2's session fingerprint.
      redis.smembers.mockResolvedValue(['user-1-real-token']);
      const result = await service.revokeMySession('not-a-real-fingerprint', user);
      expect(result.success).toBe(false);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('revokes a session that does belong to the caller', async () => {
      const token = 'user-1-real-token';
      const fingerprint = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
      redis.smembers.mockResolvedValue([token]);
      const result = await service.revokeMySession(fingerprint, user);
      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalledWith(`auth:refresh:${token}`, `auth:refresh_meta:${token}`);
      expect(redis.srem).toHaveBeenCalledWith('auth:user:user-1:refresh_tokens', token);
    });
  });

  describe('deactivateMyAccount', () => {
    it('deactivates the caller\'s own row and revokes all their sessions via AuthService.logout', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow());
      prisma.userProfiles.update.mockResolvedValue(profileRow({ is_active: false }));
      const result = await service.deactivateMyAccount(user);
      expect(result.success).toBe(true);
      expect(prisma.userProfiles.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { is_active: false } });
      expect(authService.logout).toHaveBeenCalledWith('user-1');
    });

    it('never accepts another user\'s id — always derives from the JWT', async () => {
      prisma.userProfiles.findUnique.mockResolvedValue(profileRow({ id: 'user-2' }));
      prisma.userProfiles.update.mockResolvedValue({});
      await service.deactivateMyAccount(otherUser);
      expect(prisma.userProfiles.findUnique).toHaveBeenCalledWith({ where: { id: 'user-2' } });
      expect(authService.logout).toHaveBeenCalledWith('user-2');
    });
  });
});
