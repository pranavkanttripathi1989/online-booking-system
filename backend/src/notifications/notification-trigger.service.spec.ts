import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService, resolveTemplateCategory } from './notification-trigger.service';
import { NotificationsService } from './notifications.service';
import { NotificationProviderConfigService } from './notification-provider-config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;
  let prisma: {
    notificationPreferences: { findUnique: jest.Mock };
    userProfiles: { findUnique: jest.Mock };
    notificationSendLog: { count: jest.Mock; create: jest.Mock };
  };
  let notificationsService: { create: jest.Mock };
  let providerConfigService: { getActiveConfigForOrg: jest.Mock };

  const payload = { title: 'New appointment', message: 'You have a new appointment', type: 'appointment' as const };

  beforeEach(async () => {
    prisma = {
      notificationPreferences: { findUnique: jest.fn() },
      userProfiles: { findUnique: jest.fn() },
      // REQ025 — the daily frequency cap's own read/write. Defaults to "0
      // sent so far today", i.e. under the cap, so every pre-existing test
      // below reaches the same SMS/provider logic it did before unchanged.
      notificationSendLog: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
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

  // REQ025 (US-NOT-01 remainder) — WhatsApp attempted first, SMS only as a
  // fallback, matching the PRD's own channel priority (Appendix C).
  describe('WhatsApp-first dispatch with SMS fallback', () => {
    it('tries WhatsApp before SMS when both are enabled and configured', async () => {
      const whatsappSend = jest.fn().mockResolvedValue({ sent: true });
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp'
          ? Promise.resolve({ provider: { id: 'gupshup_whatsapp', send: whatsappSend }, credentials: {} })
          : Promise.resolve({ provider: { id: 'msg91', send: smsSend }, credentials: {} }),
      );

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(whatsappSend).toHaveBeenCalled();
      expect(smsSend).not.toHaveBeenCalled();
      expect(prisma.notificationSendLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ user_id: 'user-1', channel: 'whatsapp' }) }),
      );
    });

    it('falls back to SMS when WhatsApp is enabled but no WhatsApp provider is configured for the org', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp' ? Promise.resolve(null) : Promise.resolve({ provider: { id: 'msg91', send: smsSend }, credentials: {} }),
      );

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(smsSend).toHaveBeenCalled();
    });

    it('falls back to SMS when the WhatsApp provider reports a failed send', async () => {
      const whatsappSend = jest.fn().mockResolvedValue({ sent: false, error: 'template not approved' });
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp'
          ? Promise.resolve({ provider: { id: 'gupshup_whatsapp', send: whatsappSend }, credentials: {} })
          : Promise.resolve({ provider: { id: 'msg91', send: smsSend }, credentials: {} }),
      );

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(whatsappSend).toHaveBeenCalled();
      expect(smsSend).toHaveBeenCalled();
    });

    it('sends via SMS as before when WhatsApp is simply disabled in preferences (regression check)', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(providerConfigService.getActiveConfigForOrg).toHaveBeenCalledWith('org-a', 'sms');
      expect(providerConfigService.getActiveConfigForOrg).not.toHaveBeenCalledWith('org-a', 'whatsapp');
      expect(smsSend).toHaveBeenCalled();
    });
  });

  // REQ025 (US-NOT-04)
  describe('quiet hours', () => {
    it('suppresses an external send inside the configured quiet-hours window (non-critical event)', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      // 21:00-08:00 IST; 18:00 UTC = 23:30 IST, inside the window.
      prisma.notificationPreferences.findUnique.mockResolvedValue({
        app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false,
        quiet_hours_start: '21:00', quiet_hours_end: '08:00',
      });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      jest.useFakeTimers().setSystemTime(new Date('2026-08-24T18:00:00.000Z'));
      await service.dispatch('user-1', 'new_message', { ...payload, type: 'alert' });
      jest.useRealTimers();

      expect(smsSend).not.toHaveBeenCalled();
    });

    it('still sends a genuinely time-critical appointment_reminder inside quiet hours', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({
        app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false,
        quiet_hours_start: '21:00', quiet_hours_end: '08:00',
      });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      jest.useFakeTimers().setSystemTime(new Date('2026-08-24T18:00:00.000Z')); // 23:30 IST
      await service.dispatch('user-1', 'appointment_reminder', payload);
      jest.useRealTimers();

      expect(smsSend).toHaveBeenCalled();
    });

    it('sends normally outside the configured quiet-hours window', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({
        app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false,
        quiet_hours_start: '21:00', quiet_hours_end: '08:00',
      });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      // 06:00 UTC = 11:30 IST, well outside 21:00-08:00.
      jest.useFakeTimers().setSystemTime(new Date('2026-08-24T06:00:00.000Z'));
      await service.dispatch('user-1', 'new_appointment', payload);
      jest.useRealTimers();

      expect(smsSend).toHaveBeenCalled();
    });

    describe('isWithinQuietHours — pure function, wraps-midnight logic', () => {
      it('handles a same-day window (no midnight wrap)', () => {
        expect(service.isWithinQuietHours('09:00', '17:00', new Date('2026-01-01T14:30:00.000Z'))).toBe(false); // 20:00 IST, outside
        expect(service.isWithinQuietHours('09:00', '17:00', new Date('2026-01-01T05:00:00.000Z'))).toBe(true); // 10:30 IST, inside
      });

      it('handles a midnight-wrapping window', () => {
        expect(service.isWithinQuietHours('21:00', '08:00', new Date('2026-01-01T18:00:00.000Z'))).toBe(true); // 23:30 IST
        expect(service.isWithinQuietHours('21:00', '08:00', new Date('2026-01-01T01:00:00.000Z'))).toBe(true); // 06:30 IST
        expect(service.isWithinQuietHours('21:00', '08:00', new Date('2026-01-01T06:00:00.000Z'))).toBe(false); // 11:30 IST
      });

      it('treats an identical start/end as "no quiet hours" rather than "all day"', () => {
        expect(service.isWithinQuietHours('09:00', '09:00', new Date())).toBe(false);
      });
    });
  });

  // REQ025 (US-NOT-04)
  describe('daily frequency cap', () => {
    it('skips the external send once the cap is reached, but still creates the in-app notification', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: true, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });
      prisma.notificationSendLog.count.mockResolvedValue(10); // already at the cap

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(smsSend).not.toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('sends normally when under the cap', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });
      prisma.notificationSendLog.count.mockResolvedValue(9);

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(smsSend).toHaveBeenCalled();
    });

    // REQ025 (US-NOT-05) — a failed send must not spend the recipient's
    // quota, since it never actually reached them.
    it('only counts status: sent attempts toward the daily cap, never failed ones', async () => {
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: jest.fn().mockResolvedValue({ sent: true }) }, credentials: {} });

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(prisma.notificationSendLog.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'sent' }) }),
      );
    });
  });

  // REQ025 (US-NOT-05) — the delivery-analytics data source: every
  // attempted external send is logged, success or failure, so the report
  // has real failures to show, not just successes.
  describe('logSendAttempt — delivery analytics data', () => {
    it('logs a failed SMS attempt with status: failed and the provider error message', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: false, error: 'bad authkey' });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      await service.dispatch('user-1', 'new_appointment', payload);

      // P1-01/REQ144 — SMS is not Meta-billed under this model, so a
      // 'failed' SMS row (like every SMS row) carries no category/cost.
      expect(prisma.notificationSendLog.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          event_type: 'new_appointment',
          channel: 'sms',
          status: 'failed',
          error_message: 'bad authkey',
          client_org_id: 'org-a',
          template_category: null,
          billable: false,
          cost_micro_rupees: null,
        },
      });
    });

    it('logs a successful SMS attempt with status: sent and no error message', async () => {
      const smsSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: true, whatsapp_enabled: false, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'msg91', send: smsSend }, credentials: {} });

      await service.dispatch('user-1', 'new_appointment', payload);

      expect(prisma.notificationSendLog.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          event_type: 'new_appointment',
          channel: 'sms',
          status: 'sent',
          error_message: undefined,
          client_org_id: 'org-a',
          template_category: null,
          billable: false,
          cost_micro_rupees: null,
        },
      });
    });
  });

  // P1-01/REQ144
  describe('WhatsApp template-category routing + conversation metering', () => {
    it('logs a sent WhatsApp reminder as billable, category utility, at the utility rate', async () => {
      const whatsappSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: false, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'gupshup_whatsapp', send: whatsappSend }, credentials: {} });

      await service.dispatch('user-1', 'appointment_reminder', payload);

      expect(prisma.notificationSendLog.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          event_type: 'appointment_reminder',
          channel: 'whatsapp',
          status: 'sent',
          error_message: undefined,
          client_org_id: 'org-a',
          template_category: 'utility',
          billable: true,
          cost_micro_rupees: 115000,
        },
      });
    });

    it('logs a sent WhatsApp new_review nudge as category marketing, at the marketing rate — 7.5x utility', async () => {
      const whatsappSend = jest.fn().mockResolvedValue({ sent: true });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: false, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'gupshup_whatsapp', send: whatsappSend }, credentials: {} });

      await service.dispatch('user-1', 'new_review', payload);

      const call = prisma.notificationSendLog.create.mock.calls[0][0];
      expect(call.data.template_category).toBe('marketing');
      expect(call.data.cost_micro_rupees).toBe(863100); // ~7.5x utility's 115000, not an exact multiple (PRD-v2's own rounded "7.5x" is approximate)
    });

    it('a failed WhatsApp send is logged as not billable, with no cost — Meta never opened the conversation', async () => {
      const whatsappSend = jest.fn().mockResolvedValue({ sent: false, error: 'template not approved' });
      prisma.notificationPreferences.findUnique.mockResolvedValue({ app_enabled: false, sms_enabled: false, whatsapp_enabled: true, email_enabled: false });
      prisma.userProfiles.findUnique.mockResolvedValue({ phone: '+919810000000', client_org_id: 'org-a' });
      providerConfigService.getActiveConfigForOrg.mockResolvedValue({ provider: { id: 'gupshup_whatsapp', send: whatsappSend }, credentials: {} });

      await service.dispatch('user-1', 'appointment_reminder', payload);

      const call = prisma.notificationSendLog.create.mock.calls[0][0];
      expect(call.data.status).toBe('failed');
      expect(call.data.billable).toBe(false);
      expect(call.data.cost_micro_rupees).toBeNull();
    });

    it('resolveTemplateCategory pins every transactional event away from marketing, and an unmapped event fails toward the expensive category, never toward free', () => {
      expect(resolveTemplateCategory('appointment_reminder')).toBe('utility');
      expect(resolveTemplateCategory('payment_received')).toBe('utility');
      ['new_appointment', 'appointment_reminder', 'appointment_cancelled', 'payment_received', 'queue_delay'].forEach((eventType) => {
        expect(resolveTemplateCategory(eventType)).not.toBe('marketing');
      });
      expect(resolveTemplateCategory('totally_unmapped_event')).toBe('marketing');
    });
  });
});
