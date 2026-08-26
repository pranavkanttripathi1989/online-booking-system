import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, isSameOrg } from '../common/scoping/tenant-scope';
import { SkipQueueEntryInput, TransferQueueEntryInput } from './dto/queue.input';
import { ChecklistService } from '../checklist/checklist.service';
import { NotificationTriggerService, DispatchPayload } from '../notifications/notification-trigger.service';
import { interleaveByRatio } from '../common/scheduling/interleave-walkins';

export const QUEUE_UPDATED_EVENT = 'queueUpdated';

const DEFAULT_RETURN_AFTER = 3;

// REQ117 (US-QUE-04) — trailing window for the rolling-median predictive
// ETA. Wide enough to smooth day-to-day volume swings, narrow enough that
// a clinician's recently-changed pace (e.g. a new consultation format)
// still shows up within two weeks rather than being diluted by months of
// stale history.
const ETA_WINDOW_DAYS = 14;

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

const INCLUDE = {
  appointment: { include: { patient: true } },
  clinician: true,
  events: { orderBy: { created_at: 'desc' as const } },
};

// REQ019 (Phase 1, slice 4) P0 -- check-in, live queue board, and queue
// actions. QueueEntries has no client_org_id of its own -- scoped via
// clinic.client_org_id, the same precedent Appointments itself uses.
@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly checklistService: ChecklistService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  // Front-desk/manager/admin/staff see the whole clinic's queue; a
  // clinician's own board is restricted to their own queue -- the same
  // convention appointments.service.ts's selfScope() already established.
  private selfScope(user: JwtPayload) {
    if (user.roles.includes('clinician')) return { clinician_id: user.clinician_id ?? '__no_clinician_link__' };
    return {};
  }

  // Shared by queueBoard() and broadcastDelay() (REQ117/REQ118) -- both
  // need "does this clinician exist, is it in the caller's org, and if
  // the caller is a clinician are they viewing their own queue" resolved
  // identically before touching any QueueEntries.
  private async assertClinicianAccess(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician) throw new NotFoundException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new NotFoundException('Clinician not found');
    if (user.roles.includes('clinician') && clinicianId !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new NotFoundException('Clinician not found');
    }
    return clinician;
  }

  // REQ119 (REQ017 US-CAL-04 / REQ019 FR-QUE-02) — classifies each waiting
  // entry as booked-in-advance vs. walk-in, then hands both groups to the
  // shared interleaveByRatio() (common/scheduling/interleave-walkins.ts) —
  // this method only owns the classification, not the merge order.
  //
  // No `is_walk_in` flag exists anywhere in this schema (confirmed by grep
  // before building this). The heuristic used — an appointment created on
  // the same calendar day it's scheduled for is treated as a walk-in — is
  // a deliberate, honestly-documented simplification, not a guessed
  // certainty: see context/open-questions.md #17 for the false-positive
  // case (a patient who books online same-morning for a same-day slot)
  // and what a real flag would need.
  private applyWalkInInterleaving(entries: any[], ratio: number) {
    const sameCalendarDay = (a: Date, b: Date) => a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
    const booked: any[] = [];
    const walkIns: any[] = [];
    for (const e of entries) {
      const isWalkIn = sameCalendarDay(e.appointment.created_at, e.appointment.appointment_time);
      (isWalkIn ? walkIns : booked).push(e);
    }
    return interleaveByRatio(booked, walkIns, ratio);
  }

  // REQ118 (US-QUE-06) — dispatches to every currently-'waiting' patient's
  // linked login account, if any (same "unlinked account is skipped
  // silently, not an error" convention as appointments.service.ts's own
  // notifyLinkedProfile). Never touches 'called'/'in_progress'/'done'
  // entries -- only patients still actually waiting need the notice.
  private async notifyPatientAccount(patientId: string, eventType: string, payload: DispatchPayload): Promise<boolean> {
    const profile = await this.prisma.userProfiles.findFirst({ where: { patient_id: patientId, is_deleted: false } });
    if (!profile) return false;
    await this.notificationTrigger.dispatch(profile.id, eventType, payload);
    return true;
  }

  async broadcastDelay(clinicianId: string, delayMinutes: number, user: JwtPayload) {
    if (!Number.isInteger(delayMinutes) || delayMinutes <= 0) {
      throw new BadRequestException('delay_minutes must be a positive integer');
    }
    const clinician = await this.assertClinicianAccess(clinicianId, user);
    const waitingEntries = await this.prisma.queueEntries.findMany({
      where: { clinician_id: clinicianId, status: 'waiting' },
      include: { appointment: true },
    });

    let notifiedCount = 0;
    for (const entry of waitingEntries) {
      const notified = await this.notifyPatientAccount(entry.appointment.patient_id, 'queue_delay', {
        title: 'Running behind schedule',
        message: `${clinician.first_name} ${clinician.last_name} is running approximately ${delayMinutes} minutes behind schedule. Thanks for your patience.`,
        type: 'appointment',
        priority: 'medium',
      });
      if (notified) notifiedCount += 1;
    }

    return { waiting_count: waitingEntries.length, notified_count: notifiedCount };
  }

  private toGraphQL(entry: any) {
    return {
      id: entry.id,
      appointment_id: entry.appointment_id,
      clinic_id: entry.clinic_id,
      clinician_id: entry.clinician_id,
      patient_name: `${entry.appointment.patient.first_name} ${entry.appointment.patient.last_name}`,
      token_no: entry.token_no,
      status: entry.status,
      checked_in_at: entry.checked_in_at,
      called_at: entry.called_at,
      events: entry.events,
    };
  }

  private async loadScoped(id: string, user: JwtPayload) {
    const entry = await this.prisma.queueEntries.findUnique({
      where: { id },
      include: { ...INCLUDE, clinic: true },
    });
    if (!entry) throw new NotFoundException('Queue entry not found');
    if (!isSameOrg(user, entry.clinic.client_org_id)) throw new NotFoundException('Queue entry not found');
    if (user.roles.includes('clinician') && entry.clinician_id !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new NotFoundException('Queue entry not found');
    }
    return entry;
  }

  // Public: also called from AppointmentsService.transitionStatus() after
  // syncFromAppointmentStatus() runs inside its own transaction, so a
  // status change reaching the queue (check-in, start, complete, no-show,
  // cancel) refreshes any open queue-board subscription too.
  async publish(clinicId: string) {
    await this.pubSub.publish(QUEUE_UPDATED_EVENT, { queueUpdated: clinicId });
  }

  // US-QUE-03: one clinician's live board -- now-serving ('called' or
  // 'in_progress'), the next 5 waiting (skipped entries excluded until
  // they auto-return), a retrospective average wait for today's 'done'
  // entries, and (REQ117, US-QUE-04) a predictive rolling-median ETA
  // across the trailing ETA_WINDOW_DAYS -- median rather than mean since
  // a single unusually long consultation shouldn't swing the estimate a
  // waiting patient sees. Both figures are kept, not one replacing the
  // other: today-only average tells staff how today itself is pacing;
  // the rolling median is the smoother, more predictive figure for a
  // patient who just checked in.
  async queueBoard(clinicianId: string, user: JwtPayload) {
    const clinician = await this.assertClinicianAccess(clinicianId, user);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - ETA_WINDOW_DAYS);
    windowStart.setHours(0, 0, 0, 0);

    const [nowServing, allWaiting, hybridWindow, doneInWindow] = await Promise.all([
      this.prisma.queueEntries.findFirst({
        where: { clinician_id: clinicianId, status: { in: ['called', 'in_progress'] } },
        include: INCLUDE,
        orderBy: { called_at: 'asc' },
      }),
      // REQ119 -- fetched in full (no `take`) so hybrid-mode interleaving
      // can reorder across the whole waiting list before the display-only
      // top-5 slice below; slot/session mode (the overwhelming majority)
      // keeps its pre-existing token_no/checked_in_at order untouched.
      this.prisma.queueEntries.findMany({
        where: { clinician_id: clinicianId, status: 'waiting' },
        include: INCLUDE,
        orderBy: [{ token_no: 'asc' }, { checked_in_at: 'asc' }],
      }),
      this.prisma.clinicianAvailability.findFirst({
        where: {
          clinician_id: clinicianId,
          is_deleted: false,
          is_active: true,
          mode: 'hybrid',
          walkin_ratio: { not: null },
          OR: [{ day_of_week: new Date().getUTCDay() }, { recurrence_type: 'daily' }],
        },
      }),
      this.prisma.queueEntries.findMany({
        where: { clinician_id: clinicianId, status: 'done', called_at: { not: null }, checked_in_at: { gte: windowStart } },
        select: { checked_in_at: true, called_at: true },
      }),
    ]);

    const orderedWaiting = hybridWindow?.walkin_ratio
      ? this.applyWalkInInterleaving(allWaiting, hybridWindow.walkin_ratio)
      : allWaiting;
    const waiting = orderedWaiting.slice(0, 5);

    const waitMinutes = (e: { checked_in_at: Date; called_at: Date | null }) =>
      e.called_at ? (e.called_at.getTime() - e.checked_in_at.getTime()) / 60000 : null;
    const isRealWait = (m: number | null): m is number => m != null && m >= 0;

    const todayWaits = doneInWindow.filter((e) => e.checked_in_at >= todayStart).map(waitMinutes).filter(isRealWait);
    const averageWaitMinutes = todayWaits.length > 0 ? Math.round(todayWaits.reduce((a, b) => a + b, 0) / todayWaits.length) : undefined;

    const windowWaits = doneInWindow.map(waitMinutes).filter(isRealWait);
    const predictedWaitMinutes = median(windowWaits);

    return {
      clinician_id: clinicianId,
      clinician_name: `${clinician.first_name} ${clinician.last_name}`,
      now_serving: nowServing ? this.toGraphQL(nowServing) : undefined,
      waiting: waiting.map((e) => this.toGraphQL(e)),
      average_wait_minutes: averageWaitMinutes,
      predicted_wait_minutes: predictedWaitMinutes,
    };
  }

  // Org-wide listing (no clinic/clinician argument) -- the same shape as
  // prescriptions()/encounters(), and what the tenancy matrix exercises,
  // since clinicQueue()/queueBoard() both require an id from the org whose
  // isolation is being tested and so can't stand in for a plain "list mine"
  // query the way every sibling domain's matrix case expects.
  async queueEntries(user: JwtPayload) {
    const entries = await this.prisma.queueEntries.findMany({
      where: { ...this.orgScope(user), ...this.selfScope(user) },
      include: INCLUDE,
      orderBy: [{ checked_in_at: 'desc' }],
    });
    return entries.map((e) => this.toGraphQL(e));
  }

  async clinicQueue(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new NotFoundException('Clinic not found');

    const entries = await this.prisma.queueEntries.findMany({
      where: { clinic_id: clinicId, ...this.selfScope(user), status: { in: ['waiting', 'called', 'in_progress'] } },
      include: INCLUDE,
      orderBy: [{ token_no: 'asc' }, { checked_in_at: 'asc' }],
    });
    return entries.map((e) => this.toGraphQL(e));
  }

  // US-QUE-05: earliest 'waiting' entry for this clinician, ordered by
  // token then arrival. Skipped entries are deliberately excluded from
  // 'waiting' (they only rejoin it via recall/auto-recall), so this never
  // needs its own skip-filtering logic.
  async callNext(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician) throw new NotFoundException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new NotFoundException('Clinician not found');

    const next = await this.prisma.queueEntries.findFirst({
      where: { clinician_id: clinicianId, status: 'waiting' },
      orderBy: [{ token_no: 'asc' }, { checked_in_at: 'asc' }],
    });
    if (!next) throw new BadRequestException('No patients waiting in this queue');

    // REQ051 (US-QUE-06) — a service configured with a mandatory checklist
    // blocks "call next" until every required item is complete for this
    // visit. Checked against the appointment, not any encounter -- see
    // ChecklistCompletions' own schema comment for why.
    const missing = await this.checklistService.getIncompleteRequiredItems(next.appointment_id);
    if (missing.length > 0) {
      throw new BadRequestException(`Cannot call this patient yet — required checklist items incomplete: ${missing.join(', ')}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.queueEntries.update({
        where: { id: next.id },
        data: { status: 'called', called_at: new Date() },
        include: INCLUDE,
      });
      await tx.queueEvents.create({ data: { queue_entry_id: next.id, action: 'called', changed_by_user_id: user.sub } });
      return row;
    });
    await this.publish(clinician.clinic_id);
    return this.toGraphQL(updated);
  }

  // US-QUE-05: bring a 'called' (stepped-away) or 'skipped' entry straight
  // back to 'waiting', clearing any pending auto-return state.
  async recall(id: string, user: JwtPayload) {
    const entry = await this.loadScoped(id, user);
    if (entry.status === 'waiting') throw new BadRequestException('This patient is already waiting');
    if (entry.status === 'done' || entry.status === 'no_show') {
      throw new BadRequestException('Cannot recall an already-completed visit');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.queueEntries.update({
        where: { id },
        data: { status: 'waiting', called_at: null, skip_return_after: null, served_since_skip: 0 },
        include: INCLUDE,
      });
      await tx.queueEvents.create({ data: { queue_entry_id: id, action: 'recalled', changed_by_user_id: user.sub } });
      return row;
    });
    await this.publish(entry.clinic_id);
    return this.toGraphQL(updated);
  }

  // US-QUE-05: park this patient; auto-returns to 'waiting' once
  // `return_after` other patients on this clinician's queue have been
  // served (tracked via recordServed(), hooked into
  // AppointmentsService.transitionStatus() on 'completed').
  async skip(input: SkipQueueEntryInput, user: JwtPayload) {
    const entry = await this.loadScoped(input.queue_entry_id, user);
    if (entry.status === 'done' || entry.status === 'no_show') {
      throw new BadRequestException('Cannot skip an already-completed visit');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.queueEntries.update({
        where: { id: input.queue_entry_id },
        data: {
          status: 'skipped',
          skip_return_after: input.return_after ?? DEFAULT_RETURN_AFTER,
          served_since_skip: 0,
        },
        include: INCLUDE,
      });
      await tx.queueEvents.create({
        data: { queue_entry_id: input.queue_entry_id, action: 'skipped', reason: input.reason, changed_by_user_id: user.sub },
      });
      return row;
    });
    await this.publish(entry.clinic_id);
    return this.toGraphQL(updated);
  }

  // US-QUE-05: reassign to a colleague at the same clinic -- resets
  // token/called_at, since the new clinician's own queue ordering has no
  // relationship to the original session's token numbering.
  async transfer(input: TransferQueueEntryInput, user: JwtPayload) {
    const entry = await this.loadScoped(input.queue_entry_id, user);
    const target = await this.prisma.clinicians.findUnique({ where: { id: input.target_clinician_id } });
    if (!target || target.clinic_id !== entry.clinic_id) {
      throw new BadRequestException('Target clinician is not at this patient\'s clinic');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.appointments.update({
        where: { id: entry.appointment_id },
        data: { clinician_id: input.target_clinician_id },
      });
      const row = await tx.queueEntries.update({
        where: { id: input.queue_entry_id },
        data: { clinician_id: input.target_clinician_id, status: 'waiting', called_at: null, token_no: null },
        include: INCLUDE,
      });
      await tx.queueEvents.create({
        data: {
          queue_entry_id: input.queue_entry_id,
          action: 'transferred',
          reason: `to ${target.first_name} ${target.last_name}`,
          changed_by_user_id: user.sub,
        },
      });
      return row;
    });
    await this.publish(entry.clinic_id);
    return this.toGraphQL(updated);
  }

  // US-QUE-07: a completed appointment with no successful payment on
  // record. Read-only -- reconciliation itself happens in the existing
  // billing/finances flow; this just surfaces what would otherwise
  // silently disappear from view once the patient has left.
  async unbilledVisits(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new NotFoundException('Clinic not found');

    const appointments = await this.prisma.appointments.findMany({
      where: {
        clinic_id: clinicId,
        status: 'completed',
        is_deleted: false,
        payments: { none: { status: 'succeeded' } },
      },
      include: { patient: true, clinician: true },
      orderBy: { appointment_time: 'desc' },
    });
    return appointments.map((a) => ({
      appointment_id: a.id,
      patient_name: `${a.patient.first_name} ${a.patient.last_name}`,
      clinician_name: `${a.clinician.first_name} ${a.clinician.last_name}`,
      appointment_time: a.appointment_time,
    }));
  }

  // Hooked from AppointmentsService.transitionStatus() inside the SAME
  // transaction as the appointment's own status update -- keeps the queue
  // entry and the appointment's status as one atomic write, never two
  // separate ones that could observably disagree if the second failed.
  // `tx` is the Prisma transaction client from that call, not this.prisma.
  async syncFromAppointmentStatus(tx: any, appointment: { id: string; clinic_id: string; clinician_id: string; token_no: number | null }, newStatus: string) {
    if (newStatus === 'checked_in') {
      const existing = await tx.queueEntries.findUnique({ where: { appointment_id: appointment.id } });
      if (existing) {
        await tx.queueEntries.update({
          where: { id: existing.id },
          data: { status: 'waiting', checked_in_at: new Date(), called_at: null, skip_return_after: null, served_since_skip: 0 },
        });
      } else {
        await tx.queueEntries.create({
          data: {
            appointment_id: appointment.id,
            clinic_id: appointment.clinic_id,
            clinician_id: appointment.clinician_id,
            token_no: appointment.token_no,
          },
        });
      }
      return;
    }

    const entry = await tx.queueEntries.findUnique({ where: { appointment_id: appointment.id } });
    if (!entry) return; // never checked in via the queue -- nothing to sync

    if (newStatus === 'in_consultation') {
      await tx.queueEntries.update({ where: { id: entry.id }, data: { status: 'in_progress' } });
      await tx.queueEvents.create({ data: { queue_entry_id: entry.id, action: 'started' } });
    } else if (newStatus === 'completed') {
      await tx.queueEntries.update({ where: { id: entry.id }, data: { status: 'done' } });
      await tx.queueEvents.create({ data: { queue_entry_id: entry.id, action: 'completed' } });
      await this.recordServed(tx, appointment.clinician_id, entry.id);
    } else if (newStatus === 'no_show') {
      await tx.queueEntries.update({ where: { id: entry.id }, data: { status: 'no_show' } });
      await tx.queueEvents.create({ data: { queue_entry_id: entry.id, action: 'no_show' } });
    } else if (newStatus === 'cancelled' || newStatus === 'scheduled') {
      // 'scheduled' is resetAppointmentJourney's own target -- the patient
      // is back to pre-check-in, so the queue entry no longer applies.
      await tx.queueEvents.deleteMany({ where: { queue_entry_id: entry.id } });
      await tx.queueEntries.delete({ where: { id: entry.id } });
    }
  }

  // US-QUE-05's auto-return: every OTHER skipped entry on this clinician's
  // queue counts one more patient served; any that reach their configured
  // threshold flip back to 'waiting' without staff needing to remember them.
  private async recordServed(tx: any, clinicianId: string, justServedEntryId: string) {
    const skipped = await tx.queueEntries.findMany({
      where: { clinician_id: clinicianId, status: 'skipped', id: { not: justServedEntryId } },
    });
    for (const s of skipped) {
      const served = s.served_since_skip + 1;
      if (s.skip_return_after != null && served >= s.skip_return_after) {
        await tx.queueEntries.update({
          where: { id: s.id },
          data: { status: 'waiting', served_since_skip: 0, skip_return_after: null, called_at: null },
        });
        await tx.queueEvents.create({ data: { queue_entry_id: s.id, action: 'auto_recalled' } });
      } else {
        await tx.queueEntries.update({ where: { id: s.id }, data: { served_since_skip: served } });
      }
    }
  }
}
