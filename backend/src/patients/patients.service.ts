import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientInput } from './dto/patient.input';
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
  private selfScope(user: JwtPayload) {
    if (!user.roles.includes('patient')) return undefined;
    return { id: user.patient_id ?? '__no_patient_link__' };
  }

  async findAll(search: string | undefined, first: number, page: number, user: JwtPayload) {
    const where = {
      is_deleted: false,
      ...this.orgScope(user),
      ...this.selfScope(user),
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
    if (user.roles.includes('patient') && id !== user.patient_id) {
      throw new NotFoundException('Patient not found');
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
