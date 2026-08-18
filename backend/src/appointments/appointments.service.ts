import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentFiltersInput } from './dto/appointment-filters.input';
import { AppointmentInput, AppointmentUpdateInput } from './dto/appointment.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PUB_SUB } from '../common/pubsub.provider';

export const APPOINTMENT_UPDATED_EVENT = 'appointmentUpdated';

const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

const INCLUDE = {
  clinic: true,
  room: true,
  clinician: true,
  patient: true,
  product: true,
  booked_by_user: true,
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  private toGraphQL(a: any, statusLogs: any[] = []) {
    const start = a.appointment_time as Date;
    const end = new Date(start.getTime() + a.duration_minutes * 60000);
    return {
      id: a.id,
      tenant_id: a.clinic?.client_org_id ?? undefined,
      start_datetime: start,
      end_datetime: end,
      duration_minutes: a.duration_minutes,
      status: a.status,
      notes: a.notes || undefined,
      cancellation_reason: a.cancellation_reason ?? undefined,
      reminder_sent_at: a.reminder_sent_at ?? undefined,
      created_at: a.created_at,
      updated_at: a.updated_at,
      patient: {
        id: a.patient.id,
        first_name: a.patient.first_name,
        last_name: a.patient.last_name,
        full_name: `${a.patient.first_name} ${a.patient.last_name}`,
        email: a.patient.email,
        phone: a.patient.phone,
        date_of_birth: a.patient.date_of_birth,
        gender: a.patient.gender ?? undefined,
      },
      clinician: {
        id: a.clinician.id,
        first_name: a.clinician.first_name,
        last_name: a.clinician.last_name,
        full_name: `${a.clinician.first_name} ${a.clinician.last_name}`,
        avatar_url: a.clinician.avatar_url ?? undefined,
        clinician_type: a.clinician.clinician_type ? { id: a.clinician.clinician_type, name: a.clinician.clinician_type } : undefined,
      },
      clinic: {
        id: a.clinic.id,
        name: a.clinic.name,
        address: a.clinic.address ?? undefined,
        city: a.clinic.city ?? undefined,
        timezone: a.clinic.timezone ?? undefined,
      },
      // Rooms has no `name` column — room_number → name mapping matches
      // rooms.service.ts's own convention (Rule 9).
      room: a.room ? { id: a.room.id, name: a.room.room_number } : undefined,
      service: a.product
        ? { id: a.product.id, name: a.product.name, duration_minutes: a.product.duration_minutes ?? undefined, price: PAISE_TO_RUPEES(a.product.price) }
        : undefined,
      booked_by_user: a.booked_by_user
        ? { id: a.booked_by_user.id, name: `${a.booked_by_user.first_name} ${a.booked_by_user.last_name}` }
        : undefined,
      status_logs: statusLogs.map((l) => ({
        id: l.id,
        status: l.status,
        reason: l.reason ?? undefined,
        created_at: l.created_at,
        changed_by_user: l.changed_by_user
          ? { id: l.changed_by_user.id, name: `${l.changed_by_user.first_name} ${l.changed_by_user.last_name}` }
          : undefined,
      })),
    };
  }

  private orgScope(user: JwtPayload) {
    return user.client_org_id ? { clinic: { client_org_id: user.client_org_id } } : {};
  }

  // SECURITY: appointments() previously only org-scoped, never self-scoped --
  // any authenticated 'patient' role account could read every appointment
  // (reason, notes, clinician, other patients' names) within the org. See
  // the identical fix in patients.service.ts's selfScope for the same
  // patient_id-embedded-in-JWT pattern.
  private selfScope(user: JwtPayload) {
    if (!user.roles.includes('patient')) return {};
    return { patient_id: user.patient_id ?? '__no_patient_link__' };
  }

  async findAll(filters: AppointmentFiltersInput | undefined, first: number, page: number, user: JwtPayload) {
    const where: any = { is_deleted: false, ...this.orgScope(user), ...this.selfScope(user) };
    if (filters?.status) where.status = filters.status;
    if (filters?.clinician_id) where.clinician_id = filters.clinician_id;
    if (filters?.date_from || filters?.date_to) {
      where.appointment_time = {};
      if (filters.date_from) where.appointment_time.gte = new Date(filters.date_from);
      if (filters.date_to) where.appointment_time.lte = new Date(`${filters.date_to}T23:59:59.999Z`);
    }
    if (filters?.patient_name) {
      where.patient = {
        OR: [
          { first_name: { contains: filters.patient_name, mode: 'insensitive' } },
          { last_name: { contains: filters.patient_name, mode: 'insensitive' } },
        ],
      };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.appointments.count({ where }),
      this.prisma.appointments.findMany({
        where,
        include: INCLUDE,
        orderBy: { appointment_time: 'desc' },
        skip: (page - 1) * first,
        take: first,
      }),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / first));
    const firstItem = total === 0 ? 0 : (page - 1) * first + 1;
    return {
      data: rows.map((r) => this.toGraphQL(r)),
      paginatorInfo: {
        count: rows.length,
        currentPage: page,
        firstItem,
        hasMorePages: page < lastPage,
        lastItem: firstItem + rows.length - 1,
        lastPage,
        perPage: first,
        total,
      },
    };
  }

  private async loadScoped(id: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id }, include: INCLUDE });
    if (!appointment || appointment.is_deleted) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.client_org_id && appointment.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.roles.includes('patient') && appointment.patient_id !== user.patient_id) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async findOne(id: string, user: JwtPayload) {
    const appointment = await this.loadScoped(id, user);
    const logs = await this.prisma.appointmentStatusLogs.findMany({
      where: { appointment_id: id },
      include: { changed_by_user: true },
      orderBy: { created_at: 'desc' },
    });
    return this.toGraphQL(appointment, logs);
  }

  // Re-runs the real conflict check server-side — never trusts the client-
  // supplied slot_id as proof of availability (next-10-features-implementation-plan.md §3).
  private async assertSlotFree(clinicianId: string, start: Date, end: Date, excludeAppointmentId?: string) {
    const conflict = await this.prisma.appointments.findFirst({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        status: { notIn: ['cancelled', 'no_show'] },
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        appointment_time: { lt: end },
      },
    });
    if (conflict) {
      const conflictEnd = new Date(conflict.appointment_time.getTime() + conflict.duration_minutes * 60000);
      if (conflictEnd > start) {
        throw new BadRequestException('This time slot is no longer available');
      }
    }
  }

  async create(input: AppointmentInput, user: JwtPayload) {
    const service = await this.prisma.products.findUnique({ where: { id: input.service_id } });
    if (!service) throw new BadRequestException('Service not found');
    const start = new Date(input.start_datetime);
    const durationMinutes = service.duration_minutes ?? 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    await this.assertSlotFree(input.clinician_id, start, end);

    const room = await this.prisma.rooms.findFirst({
      where: { clinic_id: input.clinic_id, is_active: true, is_deleted: false },
    });
    if (!room) throw new BadRequestException('No active room available at this clinic');

    const created = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointments.create({
        data: {
          clinic_id: input.clinic_id,
          room_id: room.id,
          clinician_id: input.clinician_id,
          patient_id: input.patient_id,
          appointment_date: new Date(start.toDateString()),
          appointment_time: start,
          duration_minutes: durationMinutes,
          status: 'scheduled',
          reason: input.notes ?? '',
          notes: input.notes ?? '',
          product_id: input.service_id,
          booked_by_user_id: user.sub,
        },
        include: INCLUDE,
      });
      await tx.appointmentStatusLogs.create({
        data: { appointment_id: appointment.id, status: 'scheduled', changed_by_user_id: user.sub },
      });
      return appointment;
    });

    return this.toGraphQL(created);
  }

  private async transitionStatus(id: string, status: string, reason: string | undefined, user: JwtPayload) {
    const appointment = await this.loadScoped(id, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.appointments.update({
        where: { id },
        data: {
          status,
          cancellation_reason: status === 'cancelled' ? reason ?? appointment.cancellation_reason : appointment.cancellation_reason,
          updated_at: new Date(),
        },
        include: INCLUDE,
      });
      await tx.appointmentStatusLogs.create({
        data: { appointment_id: id, status, reason, changed_by_user_id: user.sub },
      });
      return row;
    });
    const result = this.toGraphQL(updated);
    await this.pubSub.publish(APPOINTMENT_UPDATED_EVENT, { appointmentUpdated: result });
    return result;
  }

  cancel(id: string, reason: string | undefined, user: JwtPayload) {
    return this.transitionStatus(id, 'cancelled', reason, user);
  }

  complete(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'completed', undefined, user);
  }

  markNoShow(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'no_show', undefined, user);
  }

  async update(id: string, input: AppointmentUpdateInput, user: JwtPayload) {
    const existing = await this.loadScoped(id, user);

    let appointmentDate = existing.appointment_date;
    let appointmentTime = existing.appointment_time;
    if (input.start_datetime) {
      appointmentTime = new Date(input.start_datetime);
      appointmentDate = new Date(appointmentTime.toDateString());
      await this.assertSlotFree(input.clinician_id ?? existing.clinician_id, appointmentTime, new Date(appointmentTime.getTime() + existing.duration_minutes * 60000), id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.appointments.update({
        where: { id },
        data: {
          status: input.status ?? existing.status,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          clinician_id: input.clinician_id ?? existing.clinician_id,
          room_id: input.room_id ?? existing.room_id,
          notes: input.notes ?? existing.notes,
          cancellation_reason: input.status === 'cancelled' ? input.cancellation_reason ?? existing.cancellation_reason : existing.cancellation_reason,
          updated_at: new Date(),
        },
        include: INCLUDE,
      });
      if (input.status && input.status !== existing.status) {
        await tx.appointmentStatusLogs.create({
          data: { appointment_id: id, status: input.status, reason: input.cancellation_reason, changed_by_user_id: user.sub },
        });
      }
      return row;
    });
    const result = this.toGraphQL(updated);
    await this.pubSub.publish(APPOINTMENT_UPDATED_EVENT, { appointmentUpdated: result });
    return result;
  }
}
