import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, isSameOrg } from '../common/scoping/tenant-scope';
import { SkipQueueEntryInput, TransferQueueEntryInput } from './dto/queue.input';

export const QUEUE_UPDATED_EVENT = 'queueUpdated';

const DEFAULT_RETURN_AFTER = 3;

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
  // they auto-return), and a retrospective average wait for today's
  // 'done' entries. Deliberately not a predictive ETA (US-QUE-04, P1 --
  // that needs a rolling median across many days, this is today-only).
  async queueBoard(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician) throw new NotFoundException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new NotFoundException('Clinician not found');
    if (user.roles.includes('clinician') && clinicianId !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new NotFoundException('Clinician not found');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [nowServing, waiting, doneToday] = await Promise.all([
      this.prisma.queueEntries.findFirst({
        where: { clinician_id: clinicianId, status: { in: ['called', 'in_progress'] } },
        include: INCLUDE,
        orderBy: { called_at: 'asc' },
      }),
      this.prisma.queueEntries.findMany({
        where: { clinician_id: clinicianId, status: 'waiting' },
        include: INCLUDE,
        orderBy: [{ token_no: 'asc' }, { checked_in_at: 'asc' }],
        take: 5,
      }),
      this.prisma.queueEntries.findMany({
        where: { clinician_id: clinicianId, status: 'done', called_at: { not: null }, checked_in_at: { gte: todayStart } },
        select: { checked_in_at: true, called_at: true },
      }),
    ]);

    const waits = doneToday
      .map((e) => (e.called_at ? (e.called_at.getTime() - e.checked_in_at.getTime()) / 60000 : null))
      .filter((m): m is number => m != null && m >= 0);
    const averageWaitMinutes = waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : undefined;

    return {
      clinician_id: clinicianId,
      clinician_name: `${clinician.first_name} ${clinician.last_name}`,
      now_serving: nowServing ? this.toGraphQL(nowServing) : undefined,
      waiting: waiting.map((e) => this.toGraphQL(e)),
      average_wait_minutes: averageWaitMinutes,
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
