import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityInput, ClinicianAvailabilityInput, LunchBreakInput } from './dto/availability.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, assertSameOrg } from '../common/scoping/tenant-scope';

const INCLUDE = { clinician: true, clinic: true, room: true };

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(a: any) {
    return {
      id: a.id,
      clinicianId: a.clinician_id,
      clinicId: a.clinic_id,
      roomId: a.room_id ?? undefined,
      dayOfWeek: a.day_of_week ?? undefined,
      startTime: a.start_time,
      endTime: a.end_time,
      recurrenceType: a.recurrence_type,
      excludeWeekends: a.exclude_weekends,
      excludeSaturday: a.exclude_saturday,
      excludeSunday: a.exclude_sunday,
      validFrom: a.valid_from,
      validUntil: a.valid_until ?? undefined,
      isActive: a.is_active,
      mode: a.mode,
      capacity: a.capacity ?? undefined,
      overbookAllowance: a.overbook_allowance,
      walkinRatio: a.walkin_ratio ?? undefined,
      clinician: { id: a.clinician.id, firstName: a.clinician.first_name, lastName: a.clinician.last_name },
      clinic: { id: a.clinic.id, name: a.clinic.name },
      room: a.room ? { id: a.room.id, roomNumber: a.room.room_number } : undefined,
    };
  }

  async findAll(limit: number | undefined, user: JwtPayload) {
    const rows = await this.prisma.clinicianAvailability.findMany({
      where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
      include: INCLUDE,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  private mapCreateData(input: CreateAvailabilityInput) {
    return {
      clinician_id: input.clinician_id,
      clinic_id: input.clinic_id,
      room_id: input.room_id || null,
      day_of_week: input.day_of_week ?? null,
      start_time: input.start_time,
      end_time: input.end_time,
      recurrence_type: input.recurrence_type,
      custom_dates: input.custom_dates ?? null,
      exclude_weekends: input.exclude_weekends ?? false,
      exclude_saturday: input.exclude_saturday ?? false,
      exclude_sunday: input.exclude_sunday ?? false,
      valid_from: input.valid_from ? new Date(input.valid_from) : new Date(),
      valid_until: input.valid_until ? new Date(input.valid_until) : null,
      is_active: input.is_active ?? true,
      mode: input.mode ?? 'slot',
      capacity: input.capacity ?? null,
      overbook_allowance: input.overbook_allowance ?? 0,
      walkin_ratio: input.walkin_ratio ?? null,
    };
  }

  // SECURITY: create() previously never validated input.clinic_id against the
  // caller's org at all -- only update()/remove() did, since they happen to
  // look up an existing record anyway. A manager/admin could create an
  // availability template attributed to a DIFFERENT organization's clinic
  // just by passing its clinic_id, polluting another tenant's schedule data
  // (e.g. sabotaging a competitor's booking availability). Same gap class
  // fixed in blocks.service.ts's createSpacerBlock/createRoomBlock.
  async create(input: CreateAvailabilityInput, user: JwtPayload) {
    if (user.client_org_id) {
      const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
      if (!clinic || clinic.client_org_id !== user.client_org_id) {
        return { success: false, userErrors: [{ message: 'Clinic not found' }] };
      }
    }
    try {
      const row = await this.prisma.clinicianAvailability.create({ data: this.mapCreateData(input), include: INCLUDE });
      return { success: true, userErrors: [], availability: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create availability' }] };
    }
  }

  async update(id: string, input: CreateAvailabilityInput, user: JwtPayload) {
    const existing = await this.prisma.clinicianAvailability.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Availability not found' }] };
    }
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) {
      return { success: false, userErrors: [{ message: 'Availability not found' }] };
    }
    try {
      const row = await this.prisma.clinicianAvailability.update({ where: { id }, data: this.mapCreateData(input), include: INCLUDE });
      return { success: true, userErrors: [], availability: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update availability' }] };
    }
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.clinicianAvailability.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Availability not found' }] };
    }
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) {
      return { success: false, userErrors: [{ message: 'Availability not found' }] };
    }
    await this.prisma.clinicianAvailability.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // ── clinician/Availability.jsx self-service surface ──────────────────────

  async getClinicianAvailability(clinicianId: string) {
    const rows = await this.prisma.clinicianAvailability.findMany({
      where: { clinician_id: clinicianId, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week ?? undefined,
      startTime: r.start_time,
      endTime: r.end_time,
      recurrenceType: r.recurrence_type,
      validFrom: r.valid_from ?? undefined,
      validUntil: r.valid_until ?? undefined,
      roomId: r.room_id ?? undefined,
      mode: r.mode,
      capacity: r.capacity ?? undefined,
    }));
  }

  async getLunchBreaks(clinicianId: string) {
    const rows = await this.prisma.lunchBreaks.findMany({ where: { clinician_id: clinicianId, is_deleted: false } });
    return rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week ?? undefined,
      startTime: r.start_time.toISOString().substring(11, 16),
      endTime: r.end_time.toISOString().substring(11, 16),
    }));
  }

  async getRooms(clinicId: string) {
    const rooms = await this.prisma.rooms.findMany({ where: { clinic_id: clinicId, is_deleted: false, is_active: true } });
    return rooms.map((r) => ({ id: r.id, name: r.room_number, roomNumber: r.room_number }));
  }

  // SECURITY: saveClinicianAvailability/deleteClinicianAvailability/
  // saveLunchBreak/deleteLunchBreak (the clinician/Availability.jsx
  // self-service surface) previously had NO ownership or tenant check at
  // all -- the resolver didn't even receive @CurrentUser(), so any
  // authenticated clinician (or manager from any org) could create, edit,
  // or delete ANY OTHER clinician's availability template or lunch break,
  // across organizations, just by passing a different clinicianId/id. Unlike
  // the read-only PHI leaks fixed elsewhere this pass, this was an
  // unrestricted cross-tenant WRITE/DELETE path. Mirrors the same
  // patient_id/clinician_id-from-JWT pattern used throughout this session's
  // security fixes; also applies org-scoping (missing here even for
  // manager/admin callers, unlike the canonical create/update/remove above).
  private assertClinicianAccess(targetClinicianId: string, clinicClientOrgId: string | null, user: JwtPayload) {
    if (user.roles.includes('clinician') && targetClinicianId !== user.clinician_id) {
      throw new NotFoundException('Clinician not found');
    }
    // F-01: was `if (user.client_org_id && clinicClientOrgId !== user.client_org_id)`,
    // which fell through (allowed) for a caller with no org of their own.
    // Not exploitable here — every caller of this is @Auth-gated to
    // manager/admin/super_admin/clinician — but it is the same latent
    // pattern, so it uses the shared fail-closed check like everything else.
    assertSameOrg(user, clinicClientOrgId, 'Clinician');
  }

  async saveClinicianAvailability(input: ClinicianAvailabilityInput, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: input.clinicianId }, include: { clinic: true } });
    if (!clinician) throw new BadRequestException('Clinician not found');
    this.assertClinicianAccess(clinician.id, clinician.clinic?.client_org_id ?? null, user);
    if (input.id) {
      const existing = await this.prisma.clinicianAvailability.findUnique({ where: { id: input.id }, include: { clinic: true } });
      if (existing) this.assertClinicianAccess(existing.clinician_id, existing.clinic?.client_org_id ?? null, user);
    }
    const data = {
      clinician_id: input.clinicianId,
      clinic_id: clinician.clinic_id,
      room_id: input.roomId || null,
      day_of_week: input.dayOfWeek != null ? parseInt(input.dayOfWeek, 10) : null,
      start_time: input.startTime,
      end_time: input.endTime,
      recurrence_type: input.recurrenceType,
      valid_from: input.validFrom ? new Date(input.validFrom) : new Date(),
      valid_until: input.validUntil ? new Date(input.validUntil) : null,
      is_active: true,
      mode: input.mode ?? 'slot',
      capacity: input.capacity ?? null,
      overbook_allowance: input.overbookAllowance ?? 0,
    };
    const row = input.id
      ? await this.prisma.clinicianAvailability.update({ where: { id: input.id }, data })
      : await this.prisma.clinicianAvailability.create({ data });
    return { id: row.id };
  }

  async deleteClinicianAvailability(id: string, user: JwtPayload) {
    const existing = await this.prisma.clinicianAvailability.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) return true; // already gone — nothing to leak or protect
    this.assertClinicianAccess(existing.clinician_id, existing.clinic?.client_org_id ?? null, user);
    await this.prisma.clinicianAvailability.update({ where: { id }, data: { is_deleted: true } });
    return true;
  }

  private toTimeOfDay(hhmm: string) {
    return new Date(`1970-01-01T${hhmm}:00.000Z`);
  }

  async saveLunchBreak(input: LunchBreakInput, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: input.clinicianId }, include: { clinic: true } });
    if (!clinician) throw new BadRequestException('Clinician not found');
    this.assertClinicianAccess(clinician.id, clinician.clinic?.client_org_id ?? null, user);
    if (input.id) {
      const existing = await this.prisma.lunchBreaks.findUnique({ where: { id: input.id }, include: { clinic: true } });
      if (existing) this.assertClinicianAccess(existing.clinician_id, existing.clinic?.client_org_id ?? null, user);
    }
    const isDaily = input.dayOfWeek === 'daily';
    const data = {
      clinician_id: input.clinicianId,
      clinic_id: clinician.clinic_id,
      day_of_week: isDaily ? null : parseInt(input.dayOfWeek, 10),
      start_time: this.toTimeOfDay(input.startTime),
      end_time: this.toTimeOfDay(input.endTime),
      is_recurring: true,
      recurrence_type: (isDaily ? 'daily' : 'weekly') as any,
    };
    const row = input.id
      ? await this.prisma.lunchBreaks.update({ where: { id: input.id }, data })
      : await this.prisma.lunchBreaks.create({ data });
    return { id: row.id };
  }

  async deleteLunchBreak(id: string, user: JwtPayload) {
    const existing = await this.prisma.lunchBreaks.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) return true;
    this.assertClinicianAccess(existing.clinician_id, existing.clinic?.client_org_id ?? null, user);
    await this.prisma.lunchBreaks.update({ where: { id }, data: { is_deleted: true } });
    return true;
  }

  // ── AVAILABLE_SLOTS_QUERY — genuinely algorithmic, next-10-features §3 ────

  async availableSlots(clinicianId: string, date: string, serviceId: string | undefined) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId } });
    if (!clinician) throw new BadRequestException('Clinician not found');

    const durationMinutes = serviceId
      ? (await this.prisma.products.findUnique({ where: { id: serviceId } }))?.duration_minutes ?? 30
      : 30;

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const dow = dayStart.getUTCDay();

    const [availabilityRows, lunchBreaks, spacerBlocks, appointments] = await Promise.all([
      this.prisma.clinicianAvailability.findMany({
        where: {
          clinician_id: clinicianId,
          is_deleted: false,
          is_active: true,
          OR: [{ day_of_week: dow }, { recurrence_type: 'daily' }],
          valid_from: { lte: dayEnd },
        },
      }),
      this.prisma.lunchBreaks.findMany({
        where: { clinician_id: clinicianId, is_deleted: false, OR: [{ day_of_week: dow }, { recurrence_type: 'daily' }] },
      }),
      this.prisma.spacerBlocks.findMany({
        where: { clinician_id: clinicianId, is_deleted: false, block_date: { gte: dayStart, lte: dayEnd } },
      }),
      this.prisma.appointments.findMany({
        where: {
          clinician_id: clinicianId,
          is_deleted: false,
          status: { notIn: ['cancelled', 'no_show'] },
          appointment_time: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    // REQ017: session/hybrid-mode windows have no discrete time slots to
    // offer — they're exposed separately via sessionAvailability() below.
    const validAvailability = availabilityRows.filter(
      (a) => a.mode === 'slot' && (!a.valid_until || a.valid_until >= dayStart),
    );

    const busy: Array<{ start: number; end: number }> = [
      ...lunchBreaks.map((l) => ({
        start: this.timeOfDayToMinutes(l.start_time),
        end: this.timeOfDayToMinutes(l.end_time),
      })),
      ...spacerBlocks.map((s) => ({
        start: this.timeOfDayToMinutes(s.start_time),
        end: this.timeOfDayToMinutes(s.end_time),
      })),
      ...appointments.map((a) => {
        const startMin = a.appointment_time.getUTCHours() * 60 + a.appointment_time.getUTCMinutes();
        return { start: startMin, end: startMin + a.duration_minutes };
      }),
    ];

    const slots: any[] = [];
    for (const window of validAvailability) {
      const winStart = this.hhmmToMinutes(window.start_time);
      const winEnd = this.hhmmToMinutes(window.end_time);
      for (let t = winStart; t + durationMinutes <= winEnd; t += durationMinutes) {
        const overlaps = busy.some((b) => t < b.end && t + durationMinutes > b.start);
        if (overlaps) continue;
        const start = new Date(dayStart.getTime() + t * 60000);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        slots.push({
          id: `${clinicianId}-${date}-${hh}:${mm}`,
          start_datetime: start,
          end_datetime: end,
          duration_minutes: durationMinutes,
          is_available: true,
          clinician: { id: clinician.id, full_name: `${clinician.first_name} ${clinician.last_name}` },
        });
      }
    }
    return slots;
  }

  // ── REQ017: session/hybrid mode — US-CAL-01/02/03 ─────────────────────────
  // Session/hybrid windows have no discrete slots (see availableSlots()
  // above); a patient joins the session and gets a token number instead.
  // This returns the capacity/remaining/estimate the booking UI needs
  // before submitting createAppointment. estimated_wait_minutes is a real,
  // simple booked-count * duration estimate — the more sophisticated
  // rolling-median-throughput refinement (US-CAL-02's "recalculates as the
  // clinic actually runs") needs REQ019/REQ020's real checked_in→completed
  // data to mean anything and is deliberately out of scope for this slice.
  async sessionAvailability(clinicianId: string, date: string, serviceId: string | undefined) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId } });
    if (!clinician) throw new BadRequestException('Clinician not found');

    const durationMinutes = serviceId
      ? (await this.prisma.products.findUnique({ where: { id: serviceId } }))?.duration_minutes ?? 30
      : 30;

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const dow = dayStart.getUTCDay();

    const window = await this.prisma.clinicianAvailability.findFirst({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        is_active: true,
        mode: { in: ['session', 'hybrid'] },
        OR: [{ day_of_week: dow }, { recurrence_type: 'daily' }],
        valid_from: { lte: dayEnd },
      },
    });
    if (!window || (window.valid_until && window.valid_until < dayStart)) return null;

    const sessionStart = new Date(`${date}T${window.start_time}:00.000Z`);
    const bookedCount = await this.prisma.appointments.count({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        status: { notIn: ['cancelled', 'no_show'] },
        booking_mode: { not: 'slot' },
        appointment_time: sessionStart,
      },
    });

    const capacity = window.capacity ?? 0;
    const totalAllowed = capacity + window.overbook_allowance;
    return {
      mode: window.mode,
      capacity,
      overbookAllowance: window.overbook_allowance,
      bookedCount,
      remaining: Math.max(0, totalAllowed - bookedCount),
      isFull: bookedCount >= totalAllowed,
      estimatedWaitMinutes: bookedCount * durationMinutes,
      startTime: window.start_time,
      endTime: window.end_time,
    };
  }

  private hhmmToMinutes(hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private timeOfDayToMinutes(d: Date) {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}
