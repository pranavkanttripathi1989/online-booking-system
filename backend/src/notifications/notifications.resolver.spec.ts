import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from './notifications.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('NotificationsResolver', () => {
  let resolver: NotificationsResolver;
  let service: { findAll: jest.Mock; markRead: jest.Mock; markAllRead: jest.Mock; remove: jest.Mock; unreadCount: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn(), remove: jest.fn(), unreadCount: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsResolver, { provide: NotificationsService, useValue: service }],
    }).compile();
    resolver = module.get(NotificationsResolver);
  });

  describe('role gating', () => {
    it('leaves every handler ungated — access control is per-caller self-scoping, not role', () => {
      const handlers = [
        NotificationsResolver.prototype.notifications,
        NotificationsResolver.prototype.unreadNotificationCount,
        NotificationsResolver.prototype.markNotificationRead,
        NotificationsResolver.prototype.markAllNotificationsRead,
        NotificationsResolver.prototype.deleteNotification,
      ];
      for (const handler of handlers) {
        expect(reflector.get(ROLES_KEY, handler)).toBeUndefined();
      }
    });
  });

  describe('argument passthrough', () => {
    it('notifications forwards filter, first, page, and user', async () => {
      const user = { sub: 'user-1' } as any;
      service.findAll.mockResolvedValue({ data: [], paginatorInfo: {} });
      await resolver.notifications('unread', 20, 2, user);
      expect(service.findAll).toHaveBeenCalledWith('unread', 20, 2, user);
    });

    it('unreadNotificationCount forwards user', async () => {
      const user = { sub: 'user-1' } as any;
      service.unreadCount.mockResolvedValue(3);
      await resolver.unreadNotificationCount(user);
      expect(service.unreadCount).toHaveBeenCalledWith(user);
    });

    it('markNotificationRead forwards id and user', async () => {
      const user = { sub: 'user-1' } as any;
      service.markRead.mockResolvedValue({ success: true });
      await resolver.markNotificationRead('notif-1', user);
      expect(service.markRead).toHaveBeenCalledWith('notif-1', user);
    });

    it('markAllNotificationsRead forwards user', async () => {
      const user = { sub: 'user-1' } as any;
      service.markAllRead.mockResolvedValue({ success: true });
      await resolver.markAllNotificationsRead(user);
      expect(service.markAllRead).toHaveBeenCalledWith(user);
    });

    it('deleteNotification forwards id and user', async () => {
      const user = { sub: 'user-1' } as any;
      service.remove.mockResolvedValue({ success: true });
      await resolver.deleteNotification('notif-1', user);
      expect(service.remove).toHaveBeenCalledWith('notif-1', user);
    });
  });
});
