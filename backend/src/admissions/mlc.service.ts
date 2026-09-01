import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { nextDocumentNumber, DOCUMENT_SERIES } from '../common/billing/document-numbering';
import { RecordMlcRegisterInput, RecordPoliceIntimationInput, AmendMlcRegisterInput } from './dto/admission.input';

// The statutory police-intimation window.
export const POLICE_INTIMATION_HOURS = 24;

// REQ179 (IPD slice 1) — the medico-legal case register.
//
// This is a legal record, not an application record. Three properties are
// enforced by the DATABASE (triggers in 20260902110000_ipd_adt_core), with
// this service as the friendly-error path in front of them, never a
// substitute:
//   1. A filed register cannot be edited — corrections are appended
//      MlcAmendments rows, attributed and reasoned.
//   2. A filed register cannot be deleted, ever.
//   3. Police intimation can be filled in once, later (the 24h obligation),
//      and never changed afterwards.
@Injectable()
export class MlcService {
  constructor(private readonly prisma: PrismaService) {}

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  }

  private readonly MLC_INCLUDE = {
    admission: { include: { patient: true } },
    examined_by: true,
    recorded_by: true,
    amendments: { orderBy: { amended_at: 'asc' as const }, include: { amended_by: true } },
  };

  private toGraphQL(m: any) {
    if (!m) return null;
    const overdue =
      m.police_intimated_at == null &&
      Date.now() - new Date(m.recorded_at).getTime() > POLICE_INTIMATION_HOURS * 3_600_000;

    return {
      id: m.id,
      mlc_number: m.mlc_number,
      mlc_category: m.mlc_category,
      admission_id: m.admission_id,
      admission_number: m.admission?.admission_number ?? undefined,
      patient_name: this.fullName(m.admission?.patient) || undefined,

      incident_datetime: m.incident_datetime ?? undefined,
      incident_place: m.incident_place ?? undefined,
      brought_by_name: m.brought_by_name ?? undefined,
      brought_by_relation: m.brought_by_relation ?? undefined,
      brought_by_contact: m.brought_by_contact ?? undefined,
      brought_by_id_proof: m.brought_by_id_proof ?? undefined,

      identification_mark_1: m.identification_mark_1,
      identification_mark_2: m.identification_mark_2,
      injury_details: m.injury_details,

      police_station: m.police_station ?? undefined,
      police_intimated_at: m.police_intimated_at ?? undefined,
      receiving_officer_name: m.receiving_officer_name ?? undefined,
      receiving_officer_buckle_no: m.receiving_officer_buckle_no ?? undefined,
      intimation_mode: m.intimation_mode ?? undefined,
      police_intimation_overdue: overdue,

      examined_by_name: this.fullName(m.examined_by) || undefined,
      recorded_by_name: this.fullName(m.recorded_by) || undefined,
      recorded_at: m.recorded_at,
      amendments: (m.amendments ?? []).map((a: any) => ({
        id: a.id,
        field_name: a.field_name,
        previous_value: a.previous_value,
        corrected_value: a.corrected_value,
        reason: a.reason,
        amended_at: a.amended_at,
        amended_by_name: this.fullName(a.amended_by) || undefined,
      })),
    };
  }

  async findAll(clinicId: string | undefined, pendingIntimationOnly: boolean | undefined, user: JwtPayload) {
    const registers = await this.prisma.mlcRegisters.findMany({
      where: {
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...(pendingIntimationOnly ? { police_intimated_at: null } : {}),
        ...orgScope(user),
      },
      include: this.MLC_INCLUDE,
      orderBy: { recorded_at: 'desc' },
      take: 200,
    });
    return registers.map((m) => this.toGraphQL(m));
  }

  async findOne(id: string, user: JwtPayload) {
    const register = await this.prisma.mlcRegisters.findUnique({ where: { id }, include: this.MLC_INCLUDE });
    if (!register) throw new NotFoundException('MLC register not found');
    assertSameOrg(user, register.client_org_id, 'MLC register');
    return this.toGraphQL(register);
  }

  async record(input: RecordMlcRegisterInput, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({
      where: { id: input.admission_id },
      include: { mlc: true },
    });
    if (!admission || admission.is_deleted) throw new BadRequestException('Admission not found');
    if (!isSameOrg(user, admission.client_org_id)) throw new BadRequestException('Admission not found');
    if (admission.mlc) {
      throw new ConflictException(
        `This admission already has MLC register ${admission.mlc.mlc_number}. File an amendment instead.`,
      );
    }

    const clinician = await this.prisma.clinicians.findUnique({
      where: { id: input.examined_by_clinician_id },
      include: { clinic: true },
    });
    if (!clinician || clinician.is_deleted) throw new BadRequestException('Examining clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new BadRequestException('Examining clinician not found');

    const created = await this.prisma.$transaction(async (tx) => {
      const mlcNumber = await nextDocumentNumber(tx as any, admission.clinic_id, DOCUMENT_SERIES.MLC, 'MLC');

      const register = await tx.mlcRegisters.create({
        data: {
          client_org_id: admission.client_org_id,
          clinic_id: admission.clinic_id,
          admission_id: admission.id,
          mlc_number: mlcNumber,
          mlc_category: input.mlc_category,
          incident_datetime: input.incident_datetime ?? null,
          incident_place: input.incident_place ?? null,
          brought_by_name: input.brought_by_name ?? null,
          brought_by_relation: input.brought_by_relation ?? null,
          brought_by_contact: input.brought_by_contact ?? null,
          brought_by_id_proof: input.brought_by_id_proof ?? null,
          identification_mark_1: input.identification_mark_1,
          identification_mark_2: input.identification_mark_2,
          injury_details: input.injury_details ?? '',
          police_station: input.police_station ?? null,
          examined_by_clinician_id: input.examined_by_clinician_id,
          recorded_by_user_id: user.sub,
        },
      });

      // The denormalised board flag, so the bed board and admission list can
      // show an MLC marker without a subquery.
      await tx.admissions.update({ where: { id: admission.id }, data: { is_mlc: true } });

      await tx.admissionEvents.create({
        data: {
          admission_id: admission.id,
          client_org_id: admission.client_org_id,
          event_type: 'mlc_flagged',
          payload_json: { reason: input.mlc_category },
          actor_user_id: user.sub,
        },
      });

      return register;
    });

    return this.findOne(created.id, user);
  }

  async recordPoliceIntimation(input: RecordPoliceIntimationInput, user: JwtPayload) {
    const register = await this.prisma.mlcRegisters.findUnique({ where: { id: input.mlc_register_id } });
    if (!register) throw new NotFoundException('MLC register not found');
    assertSameOrg(user, register.client_org_id, 'MLC register');
    // The DB trigger enforces this too; this is the readable error in front.
    if (register.police_intimated_at) {
      throw new ConflictException('Police intimation is already recorded for this MLC and cannot be changed');
    }

    await this.prisma.mlcRegisters.update({
      where: { id: register.id },
      data: {
        police_station: input.police_station,
        police_intimated_at: input.intimated_at ?? new Date(),
        police_intimated_by_user_id: user.sub,
        receiving_officer_name: input.receiving_officer_name,
        receiving_officer_buckle_no: input.receiving_officer_buckle_no ?? null,
        intimation_mode: input.intimation_mode ?? 'in_person',
      },
    });
    return this.findOne(register.id, user);
  }

  // The ONLY sanctioned way to correct a filed register. Reads the current
  // value straight off the row so `previous_value` is what was actually
  // recorded, never a client-supplied claim about it.
  async amend(input: AmendMlcRegisterInput, user: JwtPayload) {
    const register = await this.prisma.mlcRegisters.findUnique({ where: { id: input.mlc_register_id } });
    if (!register) throw new NotFoundException('MLC register not found');
    assertSameOrg(user, register.client_org_id, 'MLC register');

    const AMENDABLE = [
      'mlc_category',
      'injury_details',
      'identification_mark_1',
      'identification_mark_2',
      'incident_place',
      'incident_datetime',
      'brought_by_name',
      'brought_by_relation',
      'brought_by_contact',
      'brought_by_id_proof',
    ];
    if (!AMENDABLE.includes(input.field_name)) {
      throw new BadRequestException(`"${input.field_name}" is not an amendable MLC field`);
    }

    const previous = (register as any)[input.field_name];
    await this.prisma.mlcAmendments.create({
      data: {
        mlc_register_id: register.id,
        field_name: input.field_name,
        previous_value: previous == null ? '' : String(previous),
        corrected_value: input.corrected_value,
        reason: input.reason,
        amended_by_user_id: user.sub,
      },
    });

    return this.findOne(register.id, user);
  }
}
