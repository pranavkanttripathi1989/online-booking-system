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
//
// REQ025 (US-NOT-01 remainder, US-NOT-04) — REQ048 already registered a
// real WhatsApp provider (gupshup_whatsapp) in the registry, but this
// dispatch method had zero WhatsApp branch and zero channel-priority/
// fallback control flow at all (confirmed by reading this file in full
// before planning the change) — three independent, unordered boolean-gated
// branches (app/sms/email), not an ordered try-this-then-that chain. This
// slice adds: WhatsApp attempted first, SMS only as a fallback on failure
// or absent config (matching the PRD's own stated channel priority,
// Appendix C: WhatsApp -> SMS -> push -> email); quiet hours (per-user,
// "HH:MM" strings, IST-implicit -- see isWithinQuietHours()'s own comment);
// and a daily frequency cap on external sends.

// Mirrors notification-preferences.service.ts's own DEFAULTS exactly, so a
// user who's never visited the Notifications tab still gets the same
// default behavior their (lazily-seeded) preferences row would give them.
const DEFAULTS: Record<string, { email_enabled: boolean; sms_enabled: boolean; app_enabled: boolean; whatsapp_enabled: boolean }> = {
  new_appointment: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  appointment_reminder: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  appointment_cancelled: { email_enabled: true, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  new_message: { email_enabled: false, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  new_review: { email_enabled: true, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  payment_received: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  system_announcement: { email_enabled: true, sms_enabled: false, app_enabled: false, whatsapp_enabled: false },
};

// US-NOT-04's own acceptance criterion names "an imminent appointment
// reminder" as the example of a genuinely time-critical event that should
// still arrive during quiet hours. appointment_reminder is exactly that
// event type; a generic high-priority payload is the other explicit
// carve-out, without needing to thread appointment-timing data through
// every call site's payload just to compute "is this imminent".
const QUIET_HOURS_BYPASS_EVENTS = ['appointment_reminder'];

// A named constant, not a magic number scattered inline — recipient-level
// (WhatsApp+SMS combined), not per-channel, matching US-NOT-04's own
// "no more than N messages to one recipient per day" wording.
const MAX_EXTERNAL_SENDS_PER_DAY = 10;

// No per-user timezone is stored anywhere in this schema yet (REQ025 non-
// functional notes; project-plans' own zone-less-timestamp note on
// appointment_date/appointment_time is the same pre-existing
// simplification). Clinics.timezone defaults to Asia/Kolkata across this
// entire India-market product (CLAUDE.md), so quiet hours are computed
// against a fixed IST offset rather than a real per-user IANA timezone --
// documented here as a deliberate simplification, not silently guessed.
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MINUTES_PER_DAY = 24 * 60;

const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
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

  // Exported for the spec file's direct unit coverage of the pure
  // wraps-midnight logic, without needing to drive it through dispatch().
  isWithinQuietHours(quietStart: string, quietEnd: string, now: Date): boolean {
    const startMin = hhmmToMinutes(quietStart);
    const endMin = hhmmToMinutes(quietEnd);
    if (startMin === endMin) return false; // degenerate config, treat as "no quiet hours"

    const nowMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + IST_OFFSET_MINUTES) % MINUTES_PER_DAY;
    if (startMin < endMin) {
      return nowMinutes >= startMin && nowMinutes < endMin;
    }
    // Wraps midnight, e.g. 21:00 -> 08:00.
    return nowMinutes >= startMin || nowMinutes < endMin;
  }

  private async underDailyFrequencyCap(userId: string): Promise<boolean> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const count = await this.prisma.notificationSendLog.count({
      where: { user_id: userId, sent_at: { gte: startOfToday } },
    });
    return count < MAX_EXTERNAL_SENDS_PER_DAY;
  }

  private async logExternalSend(userId: string, eventType: string, channel: string) {
    await this.prisma.notificationSendLog.create({ data: { user_id: userId, event_type: eventType, channel } });
  }

  async dispatch(userId: string, eventType: string, payload: DispatchPayload) {
    const pref = await this.prisma.notificationPreferences.findUnique({
      where: { user_id_event_type: { user_id: userId, event_type: eventType as any } },
    });
    const settings = pref ?? DEFAULTS[eventType] ?? { app_enabled: true, sms_enabled: false, email_enabled: false, whatsapp_enabled: false };

    if (settings.app_enabled) {
      await this.notificationsService.create(userId, payload.title, payload.message, payload.type, payload.priority ?? 'medium');
    }

    const externalChannelRequested = settings.whatsapp_enabled || settings.sms_enabled;
    if (externalChannelRequested) {
      const bypassesQuietHours = payload.priority === 'high' || QUIET_HOURS_BYPASS_EVENTS.includes(eventType);
      const inQuietHours =
        !bypassesQuietHours &&
        !!pref?.quiet_hours_start &&
        !!pref?.quiet_hours_end &&
        this.isWithinQuietHours(pref.quiet_hours_start, pref.quiet_hours_end, new Date());

      if (inQuietHours) {
        this.logger.log(`[notification] external send suppressed for user ${userId} — inside quiet hours`);
      } else if (!(await this.underDailyFrequencyCap(userId))) {
        this.logger.log(`[notification] external send skipped for user ${userId} — daily frequency cap reached`);
      } else {
        let sent = false;
        if (settings.whatsapp_enabled) {
          sent = await this.sendWhatsapp(userId, eventType, payload.message);
        }
        if (!sent && settings.sms_enabled) {
          await this.sendSms(userId, eventType, payload.message);
        }
      }
    }

    if (settings.email_enabled) {
      this.logger.log(
        `[notification] EMAIL stub — would send "${payload.title}" to ${userId} (no AWS SES credentials configured in this environment)`,
      );
    }
  }

  // Returns whether the send actually succeeded — dispatch() falls back to
  // SMS only when this is false (provider not configured for this org, or
  // configured but the send itself failed), never when WhatsApp is simply
  // disabled in preferences (that case never reaches this method at all).
  private async sendWhatsapp(userId: string, eventType: string, message: string): Promise<boolean> {
    const profile = await this.prisma.userProfiles.findUnique({ where: { id: userId } });
    if (!profile?.phone || !profile.client_org_id) {
      this.logger.log(`[notification] WhatsApp skipped for user ${userId} — no phone number or org on file`);
      return false;
    }
    const config = await this.providerConfigService.getActiveConfigForOrg(profile.client_org_id, 'whatsapp');
    if (!config) {
      this.logger.log(`[notification] WhatsApp skipped for user ${userId} — no WhatsApp provider configured for org ${profile.client_org_id}`);
      return false;
    }
    const result = await config.provider.send(config.credentials, profile.phone, message);
    if (!result.sent) {
      this.logger.warn(`[notification] WhatsApp send failed for user ${userId} via ${config.provider.id}: ${result.error}`);
      return false;
    }
    await this.logExternalSend(userId, eventType, 'whatsapp');
    return true;
  }

  private async sendSms(userId: string, eventType: string, message: string): Promise<boolean> {
    const profile = await this.prisma.userProfiles.findUnique({ where: { id: userId } });
    if (!profile?.phone || !profile.client_org_id) {
      this.logger.log(`[notification] SMS skipped for user ${userId} — no phone number or org on file`);
      return false;
    }
    const config = await this.providerConfigService.getActiveConfigForOrg(profile.client_org_id, 'sms');
    if (!config) {
      this.logger.log(`[notification] SMS skipped for user ${userId} — no SMS provider configured for org ${profile.client_org_id}`);
      return false;
    }
    const result = await config.provider.send(config.credentials, profile.phone, message);
    if (!result.sent) {
      this.logger.warn(`[notification] SMS send failed for user ${userId} via ${config.provider.id}: ${result.error}`);
      return false;
    }
    await this.logExternalSend(userId, eventType, 'sms');
    return true;
  }
}
