import { Test, TestingModule } from '@nestjs/testing';
import { BreakGlassService } from './break-glass.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('BreakGlassService', () => {
  let service: BreakGlassService;
  let prisma: any;
  let notificationTrigger: { dispatch: jest.Mock };

  const clinicianUser: JwtPayload = { sub: 'clin-1', roles: ['clinician'], client_org_id: 'org-a' } as JwtPayload;
  const orgLessUser: JwtPayload = { sub: 'clin-2', roles: ['clinician'], client_org_id: null } as JwtPayload;

  const grant = {
    id: 'grant-1', client_org_id: 'org-a', grantee_user_id: 'clin-1', reason: 'Emergency cover',
    granted_at: new Date(), expires_at: new Date(Date.now() + 30 * 60_000), revoked_at: null,
  };

  beforeEach(async () => {
    prisma = {
      breakGlassGrants: { create: jest.fn().mockResolvedValue(grant), findMany: jest.fn().mockResolvedValue([grant]), findUnique: jest.fn(), update: jest.fn() },
      userProfiles: {
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }, { id: 'mgr-1' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'clin-1', first_name: 'Sarah', last_name: 'Mitchell' }),
      },
    };
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakGlassService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(BreakGlassService);
  });

  describe('request', () => {
    it('rejects an org-less caller (no org to alert)', async () => {
      const result = await service.request({ reason: 'x' }, orgLessUser);
      expect(result.success).toBe(false);
      expect(prisma.breakGlassGrants.create).not.toHaveBeenCalled();
    });

    it('creates a grant expiring in 30 minutes', async () => {
      const result = await service.request({ reason: 'Emergency cover' }, clinicianUser);
      expect(result.success).toBe(true);
      const data = prisma.breakGlassGrants.create.mock.calls[0][0].data;
      expect(data.grantee_user_id).toBe('clin-1');
      expect(data.client_org_id).toBe('org-a');
      const minutesUntilExpiry = (data.expires_at.getTime() - Date.now()) / 60_000;
      expect(minutesUntilExpiry).toBeGreaterThan(29);
      expect(minutesUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('alerts every admin/manager in the grantee\'s org immediately, not a batch report', async () => {
      await service.request({ reason: 'Emergency cover' }, clinicianUser);
      expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ client_org_id: 'org-a', role: { name: { in: ['admin', 'manager'] } } }),
      }));
      expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(2);
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith('admin-1', 'break_glass_requested', expect.objectContaining({ priority: 'high', type: 'alert' }));
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith('mgr-1', 'break_glass_requested', expect.objectContaining({ priority: 'high', type: 'alert' }));
    });
  });

  describe('myGrants', () => {
    it('is scoped to the caller\'s own grants only', async () => {
      await service.myGrants(clinicianUser);
      expect(prisma.breakGlassGrants.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { grantee_user_id: 'clin-1' },
      }));
    });

    it('computes is_active from expiry and revocation', async () => {
      prisma.breakGlassGrants.findMany.mockResolvedValue([
        grant, // active
        { ...grant, id: 'g2', revoked_at: new Date() }, // revoked
        { ...grant, id: 'g3', expires_at: new Date(Date.now() - 1000) }, // expired
      ]);
      const result = await service.myGrants(clinicianUser);
      expect(result.find((g) => g.id === 'grant-1')?.is_active).toBe(true);
      expect(result.find((g) => g.id === 'g2')?.is_active).toBe(false);
      expect(result.find((g) => g.id === 'g3')?.is_active).toBe(false);
    });
  });

  describe('revoke', () => {
    it('rejects a cross-org grant', async () => {
      prisma.breakGlassGrants.findUnique.mockResolvedValue({ ...grant, client_org_id: 'org-b' });
      const result = await service.revoke('grant-1', clinicianUser);
      expect(result.success).toBe(false);
      expect(prisma.breakGlassGrants.update).not.toHaveBeenCalled();
    });

    it('rejects revoking an already-revoked grant', async () => {
      prisma.breakGlassGrants.findUnique.mockResolvedValue({ ...grant, revoked_at: new Date() });
      const result = await service.revoke('grant-1', clinicianUser);
      expect(result.success).toBe(false);
    });

    it('revokes an in-scope, active grant', async () => {
      prisma.breakGlassGrants.findUnique.mockResolvedValue(grant);
      prisma.breakGlassGrants.update.mockResolvedValue({ ...grant, revoked_at: new Date() });
      const result = await service.revoke('grant-1', clinicianUser);
      expect(result.success).toBe(true);
      expect(prisma.breakGlassGrants.update).toHaveBeenCalledWith({ where: { id: 'grant-1' }, data: { revoked_at: expect.any(Date) } });
    });
  });

  describe('hasActiveGrant', () => {
    it('returns true when an active, non-expired, non-revoked grant exists', async () => {
      prisma.breakGlassGrants.findFirst = jest.fn().mockResolvedValue(grant);
      expect(await service.hasActiveGrant('clin-1')).toBe(true);
    });

    it('returns false when none exists', async () => {
      prisma.breakGlassGrants.findFirst = jest.fn().mockResolvedValue(null);
      expect(await service.hasActiveGrant('clin-1')).toBe(false);
    });
  });
});
