import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderTestInput } from './dto/order-test.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { isPlatformOperator, orgScopeVia, assertSameOrg } from '../common/scoping/tenant-scope';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class TestResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  // TC-PAT-API-010: values withheld until status === 'completed', regardless
  // of caller role — enforced here, not left to the frontend to hide.
  private toGraphQL(row: any) {
    return {
      id: row.id,
      patient: row.patient_name,
      test: row.test_name,
      ordered_by: row.ordered_by_name,
      date_ordered: row.date_ordered.toISOString().split('T')[0],
      date_completed: row.date_completed ? row.date_completed.toISOString().split('T')[0] : undefined,
      status: row.status,
      type: row.test_type,
      values: row.status === 'completed' ? (row.values as any[]) : [],
    };
  }

  async findAll(search: string | undefined, type: string | undefined, status: string | undefined, user: JwtPayload) {
    // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
    // dependant's results too, not just their own.
    const allowedPatientIds = user.roles.includes('patient')
      ? await this.patientsService.ownAndDependantPatientIds(user)
      : undefined;
    const rows = await this.prisma.testResults.findMany({
      where: {
        is_deleted: false,
        ...(type && type !== 'All' ? { test_type: type } : {}),
        ...(status && status !== 'All' ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { patient_name: { contains: search, mode: 'insensitive' as const } },
                { test_name: { contains: search, mode: 'insensitive' as const } },
                { id: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        // BUG006. Indirect tenant scoping via the ordering user's org. This
        // read `user.client_org_id ? {...} : undefined`, and `undefined` is
        // "no filter" to Prisma — so an org-less caller was unscoped. Only the
        // patient self-scope below happened to contain it.
        ...orgScopeVia(user, 'ordered_by'),
        // SECURITY: this query had no @Auth() role gate and no per-patient
        // scoping -- any authenticated 'patient' role account could read
        // every patient's lab values within the org. Restrict to the
        // caller's own linked patient_id, or their dependants' (see
        // patients.service.ts's selfScope for the identical JWT-embedded
        // pattern).
        ...(allowedPatientIds ? { patient_id: { in: allowedPatientIds } } : {}),
      },
      orderBy: { date_ordered: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.testResults.findUnique({ where: { id }, include: { ordered_by: true } });
    if (!row || row.is_deleted) {
      throw new NotFoundException('Test result not found');
    }
    // BUG006 — two separate defects lived in these four lines, and the pair of
    // them was live-exploitable by an account anyone could self-register.
    //
    // 1. `user.client_org_id && ...` skipped the ORG CHECK ENTIRELY for a caller
    //    with no org, rather than failing closed. Absence of an org was read as
    //    permission, which is the F-01 inference all over again.
    // 2. The patient self-scope then compared `row.patient_id !== user.patient_id`.
    //    For a self-registered patient both sides are null, `null !== null` is
    //    false, and the check passed — so every free-text result (patient_id
    //    NULL, which CLAUDE.md documents as the common shape here) was readable
    //    across every tenant.
    //
    // Live-reproduced by test/integration/tenancy.int-spec.ts before this fix.
    if (!isPlatformOperator(user)) {
      const rowOrgId = row.ordered_by?.client_org_id ?? null;
      if (!user.client_org_id || rowOrgId !== user.client_org_id) {
        throw new NotFoundException('Test result not found');
      }
    }
    // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
    // dependant's result too, not just their own.
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      // An unlinked/null patient_id (free-text result, or an unlinked
      // caller) matches nothing — ownAndDependantPatientIds' sentinel
      // never collides with a real row id, so this stays fail-closed.
      if (!row.patient_id || !allowedIds.includes(row.patient_id)) {
        throw new NotFoundException('Test result not found');
      }
    }
    return this.toGraphQL(row);
  }

  // F-08 (project-plans/02-findings-register.md) — patient_id used to
  // never be written at all, so findAll()/findOne()'s own patient
  // self-scoping was dead code no real row could ever match. Validates
  // the selected patient belongs to the caller's own org (Hard Rule 6),
  // the same real-`create*`-path check every other domain applies.
  async orderTest(input: OrderTestInput, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
    if (!patient || patient.is_deleted) {
      throw new BadRequestException('Patient not found');
    }
    assertSameOrg(user, patient.client_org_id, 'Patient');
    const orderingUser = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    const row = await this.prisma.testResults.create({
      data: {
        patient_id: input.patient_id,
        patient_name: input.patient,
        // The Order dialog only collects one "test type" field and uses it as
        // both the display test name and the type/icon category — mirrors
        // pages/test-results/index.jsx's own handleOrderSubmit exactly
        // ({ test: orderForm.testType, type: orderForm.testType }).
        test_name: input.testType,
        test_type: input.testType,
        ordered_by_name: orderingUser ? `${orderingUser.first_name} ${orderingUser.last_name}` : 'Unknown',
        ordered_by_user_id: user.sub,
        status: 'pending',
      },
    });
    return this.toGraphQL(row);
  }
}
