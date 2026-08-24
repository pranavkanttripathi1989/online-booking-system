import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ052 (US-BOOK-04) — hourly sweep, same @Cron pattern as
// ScheduledReportsService/WebhookDispatchService. A 'confirmed' appointment
// past its org's own no_show_grace_minutes with no check-in (status would
// have moved past 'confirmed' — e.g. 'checked_in' — if it had one) is
// auto-marked no_show, and the patient's no_show_count is incremented so
// appointments.service.ts's create() can force prepayment on their next
// booking once it crosses the org's configured threshold.
@Injectable()
export class NoShowSweepService {
  private readonly logger = new Logger(NoShowSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // Synthetic system caller, same pattern as ScheduledReportsService's own
  // cron -- isPlatformOperator() treats 'admin' as unscoped, so this can
  // act on any org's appointment in one sweep.
  private readonly systemUser: JwtPayload = {
    sub: 'system',
    roles: ['admin'],
    client_org_id: null,
    patient_id: null,
    clinician_id: null,
  } as JwtPayload;

  @Cron('0 * * * *')
  async sweep() {
    const now = new Date();
    const candidates = await this.prisma.appointments.findMany({
      where: { status: 'confirmed', is_deleted: false },
      include: { clinic: { include: { client_organization: true } } },
    });

    for (const appointment of candidates) {
      const graceMinutes = appointment.clinic.client_organization?.no_show_grace_minutes ?? 30;
      const deadline = new Date(appointment.appointment_time.getTime() + graceMinutes * 60_000);
      if (now < deadline) continue;

      try {
        await this.appointmentsService.markNoShow(appointment.id, this.systemUser);
        await this.prisma.patients.update({
          where: { id: appointment.patient_id },
          data: { no_show_count: { increment: 1 } },
        });
      } catch (e: any) {
        // One bad row must not abort the rest of the sweep.
        this.logger.error(`Failed to auto-mark appointment ${appointment.id} as no_show: ${e.message}`);
      }
    }
  }
}
