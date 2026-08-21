import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationProviderConfigService } from './notification-provider-config.service';

// REQ008/PLAN017 — the actual fix for context/open-questions.md #5:
// NotificationPreferences were real and persisted, but nothing anywhere
// read them and dispatched anything. This is that dispatch, called from the
// 4 real domain events that have one (appointments create/cancel, messages
// send, payment succeeded) -- see each call site for the wiring.
//
// appointment_reminder (needs a scheduled job, not an event hook),
// new_review (ReviewsService has no creation path at all to hook into --
// confirmed by grep, a separate gap), and system_announcement (no admin
// broadcast UI/mutation exists to originate one) are deliberately not
// wired here -- logged in context/open-questions.md, not guessed at.

// Mirrors notification-preferences.service.ts's own DEFAULTS exactly, so a
// user who's never visited the Notifications tab still gets the same
// default behavior their (lazily-seeded) preferences row would give them.
const DEFAULTS: Record<string, { email_enabled: boolean; sms_enabled: boolean; app_enabled: boolean }> = {
  new_appointment: { email_enabled: true, sms_enabled: true, app_enabled: true },
  appointment_reminder: { email_enabled: true, sms_enabled: true, app_enabled: true },
  appointment_cancelled: { email_enabled: true, sms_enabled: false, app_enabled: true },
  new_message: { email_enabled: false, sms_enabled: false, app_enabled: true },
  new_review: { email_enabled: true, sms_enabled: false, app_enabled: true },
  payment_received: { email_enabled: true, sms_enabled: true, app_enabled: true },
  system_announcement: { email_enabled: true, sms_enabled: false, app_enabled: false },
};

export interface DispatchPayload {
  title: string;
  message: string;
  type: 'appointment' | 'system' | 'payment' | 'alert';
  priority?: 'low' | 'medium' | 'high';
  action_url?: string;
}

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly providerConfigService: NotificationProviderConfigService,
  ) {}

  async dispatch(userId: string, eventType: string, payload: DispatchPayload) {
    const pref = await this.prisma.notificationPreferences.findUnique({
      where: { user_id_event_type: { user_id: userId, event_type: eventType as any } },
    });
    const settings = pref ?? DEFAULTS[eventType] ?? { app_enabled: true, sms_enabled: false, email_enabled: false };

    if (settings.app_enabled) {
      await this.notificationsService.create(userId, payload.title, payload.message, payload.type, payload.priority ?? 'medium');
    }

    if (settings.sms_enabled) {
      await this.sendSms(userId, payload.message);
    }

    if (settings.email_enabled) {
      this.logger.log(
        `[notification] EMAIL stub — would send "${payload.title}" to ${userId} (no AWS SES credentials configured in this environment)`,
      );
    }
  }

  private async sendSms(userId: string, message: string) {
    const profile = await this.prisma.userProfiles.findUnique({ where: { id: userId } });
    if (!profile?.phone || !profile.client_org_id) {
      this.logger.log(`[notification] SMS skipped for user ${userId} — no phone number or org on file`);
      return;
    }
    const config = await this.providerConfigService.getActiveConfigForOrg(profile.client_org_id, 'sms');
    if (!config) {
      this.logger.log(`[notification] SMS skipped for user ${userId} — no SMS provider configured for org ${profile.client_org_id}`);
      return;
    }
    const result = await config.provider.send(config.credentials, profile.phone, message);
    if (!result.sent) {
      this.logger.warn(`[notification] SMS send failed for user ${userId} via ${config.provider.id}: ${result.error}`);
    }
  }
}
