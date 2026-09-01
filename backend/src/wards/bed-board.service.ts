import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isSameOrg } from '../common/scoping/tenant-scope';
import { BedBoardFilterInput } from './dto/ward.input';

// REQ179 (IPD slice 1) — the live bed board.
//
// This is the hottest IPD query and the one users stare at all day, so it is
// deliberately ONE findMany with a bounded include, not a bed list plus a
// per-bed occupancy lookup. `Beds` carries denormalised client_org_id/clinic_id
// precisely so orgScope() answers it without joining two levels up.
//
// The board reads live state from BedOccupancies (the source of truth), not
// from Beds.status (a maintained cache) — so a cache divergence shows up as a
// wrong colour, never as a bed the board thinks is free while a patient is in
// it. bed-status-reconcile.service.ts closes the divergence nightly.
@Injectable()
export class BedBoardService {
  constructor(private readonly prisma: PrismaService) {}

  async bedBoard(filter: BedBoardFilterInput, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: filter.clinic_id } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');

    const beds = await this.prisma.beds.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        clinic_id: filter.clinic_id,
        ...(filter.ward_id ? { ward_id: filter.ward_id } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.ward_type ? { ward: { ward_type: filter.ward_type } } : {}),
        ...orgScope(user),
      },
      include: {
        ward: true,
        // The live timeline entry for each bed: open-ended and not cancelled.
        // At most one can exist per bed — the exclusion constraint guarantees
        // it — so take(1) is a bound, not a truncation.
        occupancies: {
          where: { end_at: null, is_cancelled: false },
          take: 1,
          include: {
            admission: {
              include: {
                patient: true,
                attending_clinician: true,
              },
            },
          },
        },
      },
      orderBy: [{ ward_id: 'asc' }, { bed_number: 'asc' }],
      ...(filter.limit ? { take: filter.limit } : {}),
    });

    const entries = beds.map((bed: any) => {
      const live = bed.occupancies?.[0];
      const admission = live?.admission;
      const patientName = admission?.patient
        ? [admission.patient.first_name, admission.patient.last_name].filter(Boolean).join(' ')
        : undefined;
      const clinicianName = admission?.attending_clinician
        ? [admission.attending_clinician.first_name, admission.attending_clinician.last_name].filter(Boolean).join(' ')
        : undefined;

      return {
        bed_id: bed.id,
        bed_number: bed.bed_number,
        status: bed.status,
        ward_id: bed.ward_id,
        ward_name: bed.ward?.name ?? '',
        ward_type: bed.ward?.ward_type ?? '',
        floor: bed.ward?.floor ?? undefined,

        admission_id: admission?.id ?? undefined,
        admission_number: admission?.admission_number ?? undefined,
        patient_id: admission?.patient_id ?? undefined,
        patient_name: patientName,
        attending_clinician_name: clinicianName,
        admitted_at: admission?.admitted_at ?? undefined,
        expected_discharge_at: admission?.expected_discharge_at ?? undefined,
        is_mlc: admission?.is_mlc ?? undefined,
        is_critical: admission?.is_critical ?? undefined,

        // A hold with no admission behind it — cleaning, maintenance, or a
        // reservation for a planned admission.
        hold_reason: live && !admission ? (live.reason ?? live.occupancy_kind) : undefined,
        hold_until: live && !admission ? (live.end_at ?? undefined) : undefined,
      };
    });

    const count = (s: string) => entries.filter((e) => e.status === s).length;
    const total = entries.length;
    const occupied = count('occupied');
    const blocked = count('blocked');
    // Blocked beds are out of service, so they are not spare capacity and are
    // excluded from the denominator — an 8-bed ward with 4 blocked and 4 full
    // is 100% occupied, not 50%.
    const denominator = total - blocked;

    return {
      summary: {
        total,
        occupied,
        available: count('available'),
        reserved: count('reserved'),
        cleaning: count('cleaning'),
        blocked,
        occupancy_rate: denominator > 0 ? Math.round((occupied / denominator) * 1000) / 10 : 0,
      },
      entries,
    };
  }
}
