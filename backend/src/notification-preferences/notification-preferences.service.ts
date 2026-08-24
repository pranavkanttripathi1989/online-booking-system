import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationPreferenceInput } from './dto/notification-preference.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Matches settings/index.jsx's NOTIF_ROWS hardcoded defaults exactly, so a
// first-time visit to the Notifications tab shows the same defaults it
// already showed before this was real data. whatsapp_enabled defaults true
// like sms_enabled's own event-specific pattern below (REQ025) -- WhatsApp
// is the PRD's own top-priority channel (Appendix C: WhatsApp -> SMS ->
// push -> email), so it should be on wherever SMS already is.
const DEFAULTS: Record<string, { email_enabled: boolean; sms_enabled: boolean; app_enabled: boolean; whatsapp_enabled: boolean }> = {
  new_appointment: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  appointment_reminder: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  appointment_cancelled: { email_enabled: true, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  new_message: { email_enabled: false, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  new_review: { email_enabled: true, sms_enabled: false, app_enabled: true, whatsapp_enabled: false },
  payment_received: { email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true },
  system_announcement: { email_enabled: true, sms_enabled: false, app_enabled: false, whatsapp_enabled: false },
};

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async myPreferences(user: JwtPayload) {
    const existing = await this.prisma.notificationPreferences.findMany({ where: { user_id: user.sub } });
    if (existing.length > 0) return existing;

    // Lazily seed defaults on first read rather than at registration --
    // avoids a separate signup-time hook, and self-heals if a row is ever
    // deleted directly.
    await this.prisma.notificationPreferences.createMany({
      data: Object.entries(DEFAULTS).map(([event_type, defaults]) => ({
        user_id: user.sub,
        event_type: event_type as any,
        ...defaults,
      })),
      skipDuplicates: true,
    });
    return this.prisma.notificationPreferences.findMany({ where: { user_id: user.sub } });
  }

  async updateMyPreferences(input: NotificationPreferenceInput[], user: JwtPayload) {
    // REQ025 (US-NOT-04) — a single-sided quiet-hours window is meaningless;
    // reject before any write rather than silently persisting a half-set pair.
    for (const row of input) {
      if (!!row.quiet_hours_start !== !!row.quiet_hours_end) {
        return { success: false, message: 'quiet_hours_start and quiet_hours_end must both be set or both be empty' };
      }
    }
    try {
      await this.prisma.$transaction(
        input.map((row) =>
          this.prisma.notificationPreferences.upsert({
            where: { user_id_event_type: { user_id: user.sub, event_type: row.event_type as any } },
            create: {
              user_id: user.sub,
              event_type: row.event_type as any,
              email_enabled: row.email_enabled,
              sms_enabled: row.sms_enabled,
              app_enabled: row.app_enabled,
              whatsapp_enabled: row.whatsapp_enabled,
              quiet_hours_start: row.quiet_hours_start,
              quiet_hours_end: row.quiet_hours_end,
            },
            update: {
              email_enabled: row.email_enabled,
              sms_enabled: row.sms_enabled,
              app_enabled: row.app_enabled,
              whatsapp_enabled: row.whatsapp_enabled,
              quiet_hours_start: row.quiet_hours_start,
              quiet_hours_end: row.quiet_hours_end,
            },
          }),
        ),
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to update notification preferences' };
    }
  }
}
