import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from './notification-trigger.service';
import { NotificationsService } from './notifications.service';
import { NotificationProviderConfigService } from './notification-provider-config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;
  let prisma: {
    notificationPreferences: { findUnique: jest.Mock };
    userProfiles: { findUnique: jest.Mock };
  };
  let notificationsService: { create: jest.Mock };
  let providerConfigService: { getActiveConfigForOrg: jest.Mock };

  const payload = { title: 'New appointment', message: 'You have a new appointment', type: 'appointment' as const };

  beforeEach(async () => {
    prisma = {
      notificationPreferences: { findUnique: jest.fn() },
      userProfiles: { findUnique: jest.fn() },
    };
    notificationsService = { create: jest.fn().mockResolvedValue({}) };
    providerConfigService = { getActiveConfigForOrg: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: NotificationProviderConfigService, useValue: providerConfigService },
      ],
    }).compile();
    service = module.get(NotificationTriggerService);
  });

  describe('preference lookup', () => {
    it('creates an in-app notification when the user has no saved preferences row, using the same DEFAULTS shape as notification-preferences.service.ts', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue(null);
      await service.dispatch('user-1', 'new_appointment', payload);
      // new_appointment defaults to app_enabled: true
      expect(notificationsService.create).toHaveBeenCalledWith('user-1', payload.title, payload.message, 'appointment', 'medium');
    });

    it('falls back to app_enabled: true, sms/email false for a completely unknown event type', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue(null);
      await service.dispatch('user-1', 'not_a_real_event', payload);
      expect(notificationsService.create).toHaveBeenCalled();
      expect(providerConfigService.getActiveConfigForOrg).not.toHaveBeenCalled();
    });

    it('honors a saved preferences row over the defaults, including disabling app notifications entirely', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: false, email_enabled: false });
      await service.dispatch('user-1', 'new_appointment', payload);
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('queries preferences scoped to the specific user_id + event_type composite key, never a global lookup', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue(null);
      await service.dispatch('user-42', 'payment_received', payload);
      expect(prisma.notificationPreferences.findUnique).toHaveBeenCalledWith({
        where: { user_id_event_type: { user_id: 'user-42', event_type: 'payment_received' } },
      });
    });
  });

  describe('SMS dispatch', () => {
    it('skips SMS (without throwing) when sms_enabled but the user has no phone on file', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: null, client_org_id: 'org-a' });
      await service.dispatch('user-1', 'new_appointment', payload);
      expect(providerConfigService.getActiveConfigForOrg).not.toHaveBeenCalled();
    });

    it('skips SMS when the user has a phone but no org configured provider exists', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue(null);
      await expect(service.dispatch('user-1', 'new_appointment', payload)).resolves.toBeUndefined();
    });

    it('sends via the org\'s configured provider when everything is in place', async () => {
      const send = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({
        provider: { id: 'msg91', send },
        credentials: { authkey: 'k' },
      });

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(providerConfigService.getActiveConfigForOrg).toHaveBeenCalledWith('org-a', 'sms');
      expect(send).toHaveBeenCalledWith({ authkey: 'k' }, '+919810000000', payload.message);
    });

    it('never throws out of dispatch when the provider reports a failed send', async () => {
      const send = jest.fn().mockResolvedValue({ sent: false, error: 'bad authkey' });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send }, credentials: {} });

      await expect(service.dispatch('user-1', 'new_appointment', payload)).resolves.toBeUndefined();
    });
  });

  describe('email (stub)', () => {
    it('does not throw and does not touch SMS/provider lookups when only email_enabled is true', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: false, email_enabled: true });
      await service.dispatch('user-1', 'new_appointment', payload);
      expect(providerConfigService.getActiveConfigForOrg).not.toHaveBeenCalled();
    });
  });
});
