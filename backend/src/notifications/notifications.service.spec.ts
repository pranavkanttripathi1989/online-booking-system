import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notifications: { findMany: jest.Mock; updateMany: jest.Mock; create: jest.Mock; count: jest.Mock };
    notificationSendLog: { groupBy: jest.Mock };
    $transaction: jest.Mock;
  };

  const user: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-1', clinician_id: null } as JwtPayload;
  const managerUser: JwtPayload = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformAdmin: JwtPayload = { sub: 'admin-1', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      notifications: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      notificationSendLog: { groupBy: jest.fn().mockResolvedValue([]) },
      // REQ134 — findAll() now runs count()/findMany() inside a
      // $transaction([...]); Promise.all mirrors how the real client awaits
      // an array of already-issued query promises.
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationsService);
  });

  describe('findAll — self-scoping', () => {
    it('scopes to the caller only, excludes soft-deleted, no read filter by default', async () => {
      await service.findAll(undefined, 200, 1, user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: undefined } }),
      );
    });

    it('applies the unread filter when requested', async () => {
      await service.findAll('unread', 200, 1, user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: false } }),
      );
    });

    it('does not apply an unread filter for any other filter value', async () => {
      await service.findAll('read', 200, 1, user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: undefined } }),
      );
    });
  });

  // REQ134 (F-14 residue)
  describe('findAll — pagination', () => {
    it('passes skip/take derived from page/first into findMany', async () => {
      await service.findAll(undefined, 20, 3, user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('returns data + a correctly-computed paginatorInfo', async () => {
      prisma.notifications.count.mockResolvedValue(45);
      prisma.notifications.findMany.mockResolvedValue([{ id: 'n-1' }]);
      const result = await service.findAll(undefined, 20, 1, user);
      expect(result.data).toHaveLength(1);
      expect(result.paginatorInfo).toEqual({
        count: 1, currentPage: 1, firstItem: 1, hasMorePages: true, lastItem: 1, lastPage: 3, perPage: 20, total: 45,
      });
    });

    it('an empty result set never reports a negative firstItem', async () => {
      prisma.notifications.count.mockResolvedValue(0);
      prisma.notifications.findMany.mockResolvedValue([]);
      const result = await service.findAll(undefined, 20, 1, user);
      expect(result.paginatorInfo.firstItem).toBe(0);
    });
  });

  // REQ134 — decoupled from findAll()'s own bounded page fetch, always the
  // true total (NotificationBell.jsx's badge needs this, not a client-side
  // count over a possibly-truncated list).
  describe('unreadCount', () => {
    it('counts only the caller\'s own unread, non-deleted notifications', async () => {
      prisma.notifications.count.mockResolvedValue(7);
      const result = await service.unreadCount(user);
      expect(prisma.notifications.count).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_deleted: false, is_read: false },
      });
      expect(result).toBe(7);
    });
  });

  describe('markRead — self-scoping prevents cross-user writes', () => {
    it('scopes the update by both id and the calling user, never id alone', async () => {
      prisma.notifications.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.markRead('notif-1', user);
      expect(prisma.notifications.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', user_id: 'user-1' },
        data: { is_read: true },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('markAllRead', () => {
    it('scopes to the caller and only unread rows', async () => {
      prisma.notifications.updateMany.mockResolvedValue({ count: 3 });
      await service.markAllRead(user);
      expect(prisma.notifications.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_read: false },
        data: { is_read: true },
      });
    });
  });

  describe('remove — self-scoping prevents cross-user deletes', () => {
    it('scopes the soft-delete by both id and the calling user', async () => {
      prisma.notifications.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.remove('notif-1', user);
      expect(prisma.notifications.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', user_id: 'user-1' },
        data: { is_deleted: true },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('create — internal system-notification helper (no client-facing mutation)', () => {
    it('creates a notification for the given user with the type/priority cast through', async () => {
      prisma.notifications.create.mockResolvedValue({ id: 'notif-new' });
      await service.create('user-2', 'Appointment cancelled', 'Your appointment was cancelled', 'appointment', 'high');
      expect(prisma.notifications.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-2',
          title: 'Appointment cancelled',
          message: 'Your appointment was cancelled',
          type: 'appointment',
          priority: 'high',
        },
      });
    });

    it('defaults priority to medium when omitted', async () => {
      prisma.notifications.create.mockResolvedValue({ id: 'notif-new' });
      await service.create('user-2', 'Title', 'Message', 'system');
      expect(prisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ priority: 'medium' }) }),
      );
    });
  });

  // REQ025 (US-NOT-05) — delivery analytics, aggregated from
  // notification-trigger.service.ts's own logSendAttempt() writes.
  describe('deliveryAnalytics', () => {
    it('scopes the aggregation to the caller org for a regular org-scoped caller', async () => {
      await service.deliveryAnalytics(managerUser);
      expect(prisma.notificationSendLog.groupBy).toHaveBeenCalledWith({
        by: ['event_type', 'channel', 'status'],
        where: { client_org_id: 'org-a' },
        _count: { _all: true },
      });
    });

    it('applies no org filter for a platform operator', async () => {
      await service.deliveryAnalytics(platformAdmin);
      expect(prisma.notificationSendLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('flattens the grouped _count into a plain count field', async () => {
      prisma.notificationSendLog.groupBy.mockResolvedValue([
        { event_type: 'new_appointment', channel: 'sms', status: 'sent', _count: { _all: 12 } },
        { event_type: 'new_appointment', channel: 'sms', status: 'failed', _count: { _all: 2 } },
      ]);
      const result = await service.deliveryAnalytics(managerUser);
      expect(result).toEqual([
        { event_type: 'new_appointment', channel: 'sms', status: 'sent', count: 12 },
        { event_type: 'new_appointment', channel: 'sms', status: 'failed', count: 2 },
      ]);
    });
  });
});
