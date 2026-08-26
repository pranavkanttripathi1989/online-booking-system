import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from './notifications.service';
import { NotificationBillingService } from './notification-billing.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('NotificationsResolver', () => {
  let resolver: NotificationsResolver;
  let service: { findAll: jest.Mock; markRead: jest.Mock; markAllRead: jest.Mock; remove: jest.Mock; unreadCount: jest.Mock; deliveryAnalytics: jest.Mock };
  let billingService: { getConversationSpend: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      remove: jest.fn(),
      unreadCount: jest.fn(),
      deliveryAnalytics: jest.fn(),
    };
    billingService = { getConversationSpend: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsResolver,
        { provide: NotificationsService, useValue: service },
        { provide: NotificationBillingService, useValue: billingService },
      ],
    }).compile();
    resolver = module.get(NotificationsResolver);
  });

  describe('role gating', () => {
    it('leaves every self-scoped handler ungated — access control is per-caller self-scoping, not role', () => {
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

    // REQ025 (US-NOT-05).
    it('gates notificationDeliveryAnalytics to manager/admin/super_admin — an org-operations view, not per-user', () => {
      expect(reflector.get(ROLES_KEY, NotificationsResolver.prototype.notificationDeliveryAnalytics)).toEqual(['manager', 'admin', 'super_admin']);
    });

    // P1-01/REQ144 — same gate, same reasoning: spend/cap is an org-operations
    // view, not a patient- or clinician-facing one.
    it('gates whatsappConversationSpend to manager/admin/super_admin', () => {
      expect(reflector.get(ROLES_KEY, NotificationsResolver.prototype.whatsappConversationSpend)).toEqual(['manager', 'admin', 'super_admin']);
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

    it('notificationDeliveryAnalytics forwards user', async () => {
      const user = { sub: 'user-1' } as any;
      service.deliveryAnalytics.mockResolvedValue([]);
      await resolver.notificationDeliveryAnalytics(user);
      expect(service.deliveryAnalytics).toHaveBeenCalledWith(user);
    });
  });

  // P1-01/REQ144
  describe('whatsappConversationSpend', () => {
    const user = { sub: 'user-1', client_org_id: 'org-a' } as any;

    it('forwards user and the optional orgId to the billing service unchanged', async () => {
      billingService.getConversationSpend.mockResolvedValue({
        periodStart: new Date('2026-08-01T00:00:00.000Z'),
        periodEnd: new Date('2026-09-01T00:00:00.000Z'),
        byCategory: [],
        totalCostMicroRupees: 0,
      });
      await resolver.whatsappConversationSpend(user, 'org-b');
      expect(billingService.getConversationSpend).toHaveBeenCalledWith(user, 'org-b');
    });

    it('converts every micro-rupee figure to rupees at this resolver boundary (Hard Rule 9)', async () => {
      billingService.getConversationSpend.mockResolvedValue({
        periodStart: new Date('2026-08-01T00:00:00.000Z'),
        periodEnd: new Date('2026-09-01T00:00:00.000Z'),
        byCategory: [
          { category: 'utility', count: 40, costMicroRupees: 4_600_000 }, // 40 * 115000
          { category: 'marketing', count: 2, costMicroRupees: 1_726_200 }, // 2 * 863100
        ],
        totalCostMicroRupees: 6_326_200,
      });

      const result = await resolver.whatsappConversationSpend(user);

      expect(result.byCategory).toEqual([
        { category: 'utility', count: 40, costRupees: 4.6 },
        { category: 'marketing', count: 2, costRupees: 1.7262 },
      ]);
      expect(result.totalCostRupees).toBeCloseTo(6.3262, 6);
    });
  });
});
