import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notifications: { findMany: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
  };

  const user: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-1', clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      notifications: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationsService);
  });

  describe('findAll — self-scoping', () => {
    it('scopes to the caller only, excludes soft-deleted, no read filter by default', async () => {
      prisma.notifications.findMany.mockResolvedValue([]);
      await service.findAll(undefined, user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: undefined } }),
      );
    });

    it('applies the unread filter when requested', async () => {
      prisma.notifications.findMany.mockResolvedValue([]);
      await service.findAll('unread', user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: false } }),
      );
    });

    it('does not apply an unread filter for any other filter value', async () => {
      prisma.notifications.findMany.mockResolvedValue([]);
      await service.findAll('read', user);
      expect(prisma.notifications.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-1', is_deleted: false, is_read: undefined } }),
      );
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
});
