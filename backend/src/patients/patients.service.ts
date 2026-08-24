import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientInput, AddDependantInput, MergePatientsInput } from './dto/patient.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(patient: any) {
    const { medical_notes, ...rest } = patient;
    return {
      ...rest,
      full_name: `${patient.first_name} ${patient.last_name}`,
      notes: medical_notes || undefined,
    };
  }

  // Patients has no client_org_id column of its own (a pre-existing schema
  // gap, not introduced here — flagged in context/backend-api-requirements-master-plan.md).
  // Scope indirectly via any appointment's clinic org; a patient with zero
  // appointments yet (freshly registered, e.g. via the booking wizard) has no
  // org path to check yet and is visible to any authenticated staff role —
  // same fallback already established for TestResults.ordered_by_user_id-less rows.
  private orgScope(user: JwtPayload) {
    if (!user.client_org_id) return undefined;
    return {
      OR: [
        { appointments: { some: { clinic: { client_org_id: user.client_org_id } } } },
        { appointments: { none: {} } },
      ],
    };
  }

  // SECURITY: patients() previously only org-scoped, never self-scoped --
  // any authenticated 'patient' role account could read every patient's
  // PHI (name, DOB, medical notes) within the org. A patient caller is now
  // restricted to their own record via the patient_id embedded in their JWT
  // (auth/strategies/jwt.strategy.ts); an unlinked patient account (no
  // patient_id yet) sees nothing rather than falling through to "everyone".
  //
  // Also closes TC-AUTH-API-009 ("a clinician cannot fetch a patient who
  // isn't theirs"): a clinician caller is restricted to patients they have
  // at least one appointment with, not the whole org's patient list.
  // Deliberately not applied to manager/admin/super_admin/staff, who
  // legitimately need the full clinic/org patient list at the front desk.
  private selfScope(user: JwtPayload, ownAndDependantIds?: string[]) {
    if (user.roles.includes('patient')) return { id: { in: ownAndDependantIds ?? [user.patient_id ?? '__no_patient_link__'] } };
    if (user.roles.includes('clinician')) {
      return { appointments: { some: { clinician_id: user.clinician_id ?? '__no_clinician_link__' } } };
    }
    return undefined;
  }

  // REQ018 US-BOOK-02 -- a patient caller may act on behalf of a dependant
  // (view their profile, book/pay for them — the latter enforced in
  // appointments.service.ts's own create()), not just their own record.
  // Widens the id set selfScope()/findOne() check membership against,
  // rather than removing the check.
  // Public: also called from AppointmentsService.create() to close a
  // pre-existing gap found while building this feature -- createAppointment
  // never validated that a 'patient'-role caller's input.patient_id was
  // their own (any authenticated patient could book under any other
  // patient_id). Reusing this instead of duplicating the query keeps the
  // "own or dependant" definition in one place.
  async ownAndDependantPatientIds(user: JwtPayload): Promise<string[]> {
    const ownId = user.patient_id ?? '__no_patient_link__';
    if (!user.roles.includes('patient') || ownId === '__no_patient_link__') return [ownId];
    const relations = await this.prisma.patientRelations.findMany({ where: { patient_id: ownId } });
    return [ownId, ...relations.map((r) => r.related_patient_id)];
  }

  async findAll(search: string | undefined, first: number, page: number, user: JwtPayload) {
    const ownAndDependantIds = user.roles.includes('patient') ? await this.ownAndDependantPatientIds(user) : undefined;
    const where = {
      is_deleted: false,
      ...this.orgScope(user),
      ...this.selfScope(user, ownAndDependantIds),
      ...(search
        ? {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' as const } },
              { last_name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.patients.count({ where }),
      this.prisma.patients.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * first,
        take: first,
      }),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / first));
    return {
      data: rows.map((p) => this.toGraphQL(p)),
      paginatorInfo: {
        count: rows.length,
        currentPage: page,
        hasMorePages: page < lastPage,
        lastPage,
        perPage: first,
        total,
      },
    };
  }

  async findOne(id: string, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id } });
    if (!patient || patient.is_deleted) {
      throw new NotFoundException('Patient not found');
    }
    if (user.roles.includes('patient')) {
      const allowedIds = await this.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(id)) throw new NotFoundException('Patient not found');
    }
    if (user.roles.includes('clinician')) {
      const treated = await this.prisma.appointments.findFirst({
        where: { patient_id: id, clinician_id: user.clinician_id ?? '__no_clinician_link__' },
      });
      if (!treated) {
        throw new NotFoundException('Patient not found');
      }
    }
    if (user.client_org_id) {
      const hasAccess = await this.prisma.appointments.findFirst({
        where: { patient_id: id, clinic: { client_org_id: user.client_org_id } },
      });
      const hasAnyAppointment = await this.prisma.appointments.findFirst({ where: { patient_id: id } });
      if (hasAnyAppointment && !hasAccess) {
        throw new NotFoundException('Patient not found');
      }
    }
    return this.toGraphQL(patient);
  }

  async appointments(patientId: string, first: number, page: number) {
    const where = { patient_id: patientId, is_deleted: false };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.appointments.count({ where }),
      this.prisma.appointments.findMany({
        where,
        include: { clinician: true, product: true, clinic: true },
        orderBy: { appointment_date: 'desc' },
        skip: (page - 1) * first,
        take: first,
      }),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / first));
    return {
      data: rows.map((a) => ({
        id: a.id,
        start_datetime: a.appointment_time,
        end_datetime: new Date(a.appointment_time.getTime() + a.duration_minutes * 60000),
        status: a.status,
        clinician: { id: a.clinician.id, full_name: `${a.clinician.first_name} ${a.clinician.last_name}` },
        service: a.product ? { id: a.product.id, name: a.product.name } : undefined,
        clinic: { id: a.clinic.id, name: a.clinic.name },
      })),
      paginatorInfo: { total, hasMorePages: page < lastPage },
    };
  }

  // REQ018 US-BOOK-01 -- surfaces candidates for the "possible duplicate"
  // prompt shown before create; never blocks create itself, since a false
  // positive here would be far worse than a missed duplicate (the
  // requirement's own text: "offered before a new one is created," not
  // "prevented"). Exact phone match, since Patients.phone has no unique
  // constraint to lean on and fuzzy phone matching has no normalization
  // rule specified in the requirement to build against.
  async findPotentialDuplicates(phone: string, firstName: string | undefined, lastName: string | undefined, dateOfBirth: string | undefined) {
    const candidates = await this.prisma.patients.findMany({
      where: { phone, is_deleted: false },
      take: 5,
    });
    if (!firstName && !lastName && !dateOfBirth) return candidates.map((p) => this.toGraphQL(p));
    return candidates
      .filter((p) => {
        const nameMatches = firstName && lastName
          ? p.first_name.toLowerCase() === firstName.toLowerCase() && p.last_name.toLowerCase() === lastName.toLowerCase()
          : false;
        const dobMatches = dateOfBirth ? p.date_of_birth.toISOString().slice(0, 10) === dateOfBirth.slice(0, 10) : false;
        return nameMatches || dobMatches;
      })
      .map((p) => this.toGraphQL(p));
  }

  // REQ018 US-BOOK-01 -- tightly permission-gated (see patients.resolver.ts:
  // manager/admin/super_admin only, not staff/receptionist, per the
  // requirement's own non-functional note). Moves every FK reference from
  // the merged record to the surviving one, soft-deletes the merged record
  // (never hard-deletes -- "reversible in principle via the audit trail"),
  // and writes a PatientMerges row. UserProfiles.patient_id is only
  // relinked if the surviving patient has no login of its own yet; two
  // logins colliding on one merge is a genuine edge case left for a human
  // to resolve manually rather than guessed at here.
  async mergePatients(input: MergePatientsInput, user: JwtPayload) {
    if (input.surviving_patient_id === input.merged_patient_id) {
      throw new BadRequestException('Cannot merge a patient into themself');
    }
    await this.findOne(input.surviving_patient_id, user);
    await this.findOne(input.merged_patient_id, user);

    await this.prisma.$transaction(async (tx) => {
      const { surviving_patient_id: survivorId, merged_patient_id: mergedId } = input;
      await tx.appointments.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.encounters.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.prescriptions.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.testResults.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.appointmentPayments.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.reviews.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      // PatientRelations references the merged id on EITHER side.
      await tx.patientRelations.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      await tx.patientRelations.updateMany({ where: { related_patient_id: mergedId }, data: { related_patient_id: survivorId } });

      const survivorHasLogin = await tx.userProfiles.findFirst({ where: { patient_id: survivorId } });
      if (!survivorHasLogin) {
        await tx.userProfiles.updateMany({ where: { patient_id: mergedId }, data: { patient_id: survivorId } });
      }

      await tx.patients.update({ where: { id: mergedId }, data: { is_deleted: true } });
      await tx.patientMerges.create({
        data: { surviving_patient_id: survivorId, merged_patient_id: mergedId, merged_by_user_id: user.sub, reason: input.reason },
      });
    });

    const survivor = await this.prisma.patients.findUnique({ where: { id: input.surviving_patient_id } });
    return this.toGraphQL(survivor);
  }

  // REQ018 US-BOOK-02 -- patient-role only (their own dependants, per the
  // requirement's "under my own phone number" framing); org-less/unlinked
  // callers get an empty list rather than an error, matching selfScope()'s
  // own fail-closed convention.
  async myDependants(user: JwtPayload) {
    const ownId = user.patient_id ?? '__no_patient_link__';
    const relations = await this.prisma.patientRelations.findMany({
      where: { patient_id: ownId },
      include: { related_patient: true },
      orderBy: { created_at: 'asc' },
    });
    return relations.map((r) => ({ id: r.id, patient: this.toGraphQL(r.related_patient), relation: r.relation }));
  }

  async addDependant(input: AddDependantInput, user: JwtPayload) {
    if (!user.roles.includes('patient') || !user.patient_id) {
      throw new ForbiddenException('Only a patient account may add a dependant');
    }
    const relation = await this.prisma.$transaction(async (tx) => {
      const dependant = await tx.patients.create({
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          date_of_birth: new Date(input.date_of_birth),
          gender: input.gender,
          email: '', // dependants have no login/contact of their own this slice
          phone: '',
          address: '',
        },
      });
      return tx.patientRelations.create({
        data: { patient_id: user.patient_id as string, related_patient_id: dependant.id, relation: input.relation },
        include: { related_patient: true },
      });
    });
    return { id: relation.id, patient: this.toGraphQL(relation.related_patient), relation: relation.relation };
  }

  async create(input: PatientInput) {
    const patient = await this.prisma.patients.create({
      data: {
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        address: input.address ?? '',
        medical_notes: input.notes ?? '',
        date_of_birth: new Date(input.date_of_birth),
      },
    });
    return this.toGraphQL(patient);
  }

  async update(id: string, input: PatientInput, user: JwtPayload) {
    await this.findOne(id, user); // enforces tenant scoping before any write
    const patient = await this.prisma.patients.update({
      where: { id },
      data: {
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        address: input.address,
        medical_notes: input.notes,
        date_of_birth: input.date_of_birth ? new Date(input.date_of_birth) : undefined,
      },
    });
    return this.toGraphQL(patient);
  }
}
