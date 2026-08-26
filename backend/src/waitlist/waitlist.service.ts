import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JoinWaitlistInput } from './dto/waitlist.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { isSameOrg, orgScopeVia } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

const CLAIM_WINDOW_MS = 30 * 60 * 1000;

// A `YYYY-MM-DD` string (the format every date-picker in this codebase
// already sends — see booking/index.jsx's own `bookingData.date.format(...)`)
// parsed straight to UTC midnight. Never a local Date#setHours — this
// codebase's own documented lesson (context/open-questions.md #15,
// clinician-dashboard's own fixture bug) is that a local-clock-hour
// construction is timezone-ambiguous on an IST host.
const toUtcDate = (dateStr: string) => new Date(`${dateStr}T00:00:00.000Z`);

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      clinician_id: row.clinician_id,
      patient_id: row.patient_id,
      waitlist_date: row.waitlist_date,
      status: row.status,
      position: row.position,
      notified_at: row.notified_at ?? undefined,
      claim_expires_at: row.claim_expires_at ?? undefined,
      created_at: row.created_at,
    };
  }

  // Notifies the patient's own login account, if linked — same
  // find-then-dispatch shape as appointments.service.ts's own
  // notifyLinkedProfile() (a private method there, not exported, hence
  // re-derived here rather than imported). An unlinked patient is skipped
  // silently, matching every other unlinked-account case in this codebase.
  private async notifyPatient(patientId: string, title: string, message: string) {
    const profile = await this.prisma.userProfiles.findFirst({ where: { patient_id: patientId, is_deleted: false } });
    if (profile) {
      await this.notificationTrigger.dispatch(profile.id, 'waitlist_slot_available', {
        title,
        message,
        type: 'appointment',
        priority: 'high',
      });
    }
  }

  async joinWaitlist(input: JoinWaitlistInput, user: JwtPayload) {
    if (!user.patient_id) {
      return { success: false, userErrors: [{ message: 'Only a linked patient account can join a waitlist' }] };
    }
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: input.clinician_id }, include: { clinic: true } });
    if (!clinician || clinician.is_deleted) {
      return { success: false, userErrors: [{ message: 'Clinician not found' }] };
    }
    // Hard Rule 6 — derive client_org_id from the CLINICIAN's own clinic,
    // never from the caller. The exact departments.service.ts bug class
    // this codebase already found and fixed once.
    const clinicOrgId = clinician.clinic.client_org_id;
    if (!clinicOrgId) {
      return { success: false, userErrors: [{ message: 'This clinician has no organization to anchor the waitlist entry to' }] };
    }
    const waitlistDate = toUtcDate(input.date);

    const existing = await this.prisma.waitlistEntries.findFirst({
      where: {
        patient_id: user.patient_id,
        clinician_id: input.clinician_id,
        waitlist_date: waitlistDate,
        status: { in: ['waiting', 'notified'] },
      },
    });
    if (existing) {
      return { success: false, userErrors: [{ message: 'You are already on the waitlist for this clinician and date' }] };
    }

    const waitingCount = await this.prisma.waitlistEntries.count({
      where: { clinician_id: input.clinician_id, waitlist_date: waitlistDate, status: 'waiting' },
    });

    try {
      const row = await this.prisma.waitlistEntries.create({
        data: {
          client_org_id: clinicOrgId,
          clinic_id: clinician.clinic_id,
          clinician_id: input.clinician_id,
          patient_id: user.patient_id,
          waitlist_date: waitlistDate,
          position: waitingCount + 1,
        },
      });
      return { success: true, userErrors: [], waitlistEntry: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to join waitlist' }] };
    }
  }

  // Self-scoped via the JWT's own patient_id — never a client-supplied one.
  // An unlinked patient account (patient_id: null) fails closed to [], the
  // same sentinel-free-fail-closed shape as every other self-scope in this
  // codebase (never fall through to "return everything").
  async myWaitlistEntries(user: JwtPayload) {
    if (!user.patient_id) return [];
    const rows = await this.prisma.waitlistEntries.findMany({
      where: { patient_id: user.patient_id },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  // clinic_id omitted -> every entry across every clinic in the caller's own
  // org (orgScopeVia the clinic relation, same no-args "my org's own rows"
  // shape checklist/scheduled-reports already use — needed so the tenancy
  // matrix can serve an org-A and org-B actor from one shared query/
  // variables pair). clinic_id given -> scoped to that one clinic.
  async clinicWaitlist(clinicId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.waitlistEntries.findMany({
        where: orgScopeVia(user, 'clinic'),
        orderBy: [{ clinician_id: 'asc' }, { waitlist_date: 'asc' }, { position: 'asc' }],
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted || !isSameOrg(user, clinic.client_org_id)) return [];
    const rows = await this.prisma.waitlistEntries.findMany({
      where: { clinic_id: clinicId },
      orderBy: [{ clinician_id: 'asc' }, { waitlist_date: 'asc' }, { position: 'asc' }],
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async cancelWaitlistEntry(id: string, user: JwtPayload) {
    const entry = await this.prisma.waitlistEntries.findUnique({ where: { id } });
    if (!entry || entry.patient_id !== user.patient_id) {
      return { success: false, userErrors: [{ message: 'Waitlist entry not found' }] };
    }
    try {
      const row = await this.prisma.waitlistEntries.update({ where: { id }, data: { status: 'cancelled' } });
      return { success: true, userErrors: [], waitlistEntry: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to cancel waitlist entry' }] };
    }
  }

  // Called from appointments.service.ts#transitionStatus() (cancelled/
  // no_show) and from WaitlistExpirySweepService (an expired claim's own
  // queue). Notify-only with a time-boxed claim window — never auto-books,
  // per REQ106's own design decision against double-booking risk in hybrid
  // mode. Reused by both callers so "who gets notified next" has exactly
  // one implementation.
  async promoteNext(clinicianId: string, date: Date) {
    const next = await this.prisma.waitlistEntries.findFirst({
      where: { clinician_id: clinicianId, waitlist_date: date, status: 'waiting' },
      orderBy: { position: 'asc' },
    });
    if (!next) return;
    const claimExpiresAt = new Date(Date.now() + CLAIM_WINDOW_MS);
    const updated = await this.prisma.waitlistEntries.update({
      where: { id: next.id },
      data: { status: 'notified', notified_at: new Date(), claim_expires_at: claimExpiresAt },
    });
    await this.notifyPatient(
      updated.patient_id,
      'A slot opened up',
      `A slot on ${date.toISOString().slice(0, 10)} you were waitlisted for is now available. Book within 30 minutes to claim it.`,
    );
  }
}
