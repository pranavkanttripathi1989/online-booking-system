import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { UpdateConsentInput, RequestDataRightsInput, ResolveRightsRequestInput, RetentionPolicyInput, NOTICE_VERSION } from './dto/consent.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';

// REQ034 — DPDP consent capture and data-subject rights requests.
// RightsRequests is a request-queued-for-review row, never an instant
// self-service hard-delete: the requirement doc's own Open Questions
// section flags a genuine tension (short churn-data retention vs.
// clinical-record statutory retention minimums) and requires erasure to
// "respect any legal-hold override... with a clear explanation... rather
// than a silent refusal". A healthcare app cannot let a patient erase a
// record still under statutory retention automatically — this module's
// job is capturing and SLA-tracking the request; an admin applies the
// actual outcome by hand via resolveRightsRequest, which is itself
// deliberately a status change, not a data-mutation trigger (automating
// the erasure/correction action is out of scope for this slice).
const SLA_DAYS = 30; // a reasonable default response window, not a specific cited statute

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  // Mirrors appointments.service.ts's own createAppointment guard: a
  // 'patient'-role caller may only act on their own record or a genuine
  // dependant's, never an arbitrary patient_id (Hard Rule 6's bug class).
  private async assertPatientAccessible(patientId: string, user: JwtPayload) {
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(patientId)) throw new BadRequestException('Patient not found');
    }
  }

  async myConsents(patientId: string, user: JwtPayload) {
    await this.assertPatientAccessible(patientId, user);
    return this.prisma.consents.findMany({ where: { patient_id: patientId, ...orgScope(user) }, orderBy: { granted_at: 'desc' } });
  }

  async updateConsent(input: UpdateConsentInput, user: JwtPayload) {
    await this.assertPatientAccessible(input.patient_id, user);
    const orgId = orgIdForWrite(user, 'Consent');
    if (!orgId) throw new BadRequestException('Cannot record consent without an organization');
    // One row per grant/revoke event (an append-only history), not an
    // upsert-in-place — a DPDP consent audit trail needs to show WHEN
    // consent was withdrawn, not just the current state.
    return this.prisma.consents.create({
      data: {
        patient_id: input.patient_id,
        client_org_id: orgId,
        purpose: input.purpose,
        granted: input.granted,
        revoked_at: input.granted ? null : new Date(),
        notice_version: NOTICE_VERSION,
      },
    });
  }

  async requestDataRights(input: RequestDataRightsInput, user: JwtPayload) {
    await this.assertPatientAccessible(input.patient_id, user);
    const orgId = orgIdForWrite(user, 'RightsRequest');
    if (!orgId) throw new BadRequestException('Cannot file a rights request without an organization');
    const slaDueAt = new Date(Date.now() + SLA_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.rightsRequests.create({
      data: {
        patient_id: input.patient_id,
        client_org_id: orgId,
        type: input.type,
        sla_due_at: slaDueAt,
        notes: input.notes,
      },
    });
  }

  // Staff/admin-facing — every open request in the caller's org, not
  // scoped to one patient (a review queue).
  async findRightsRequests(status: string | undefined, user: JwtPayload) {
    return this.prisma.rightsRequests.findMany({
      where: { ...(status ? { status } : {}), ...orgScope(user) },
      orderBy: { sla_due_at: 'asc' },
    });
  }

  async resolveRightsRequest(id: string, input: ResolveRightsRequestInput, user: JwtPayload) {
    const existing = await this.prisma.rightsRequests.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Rights request not found');
    if (!isSameOrg(user, existing.client_org_id)) throw new BadRequestException('Rights request not found');
    return this.prisma.rightsRequests.update({
      where: { id },
      data: {
        status: input.status,
        notes: input.notes ?? existing.notes,
        resolved_at: new Date(),
        resolved_by_user_id: user.sub,
      },
    });
  }

  // REQ034 (US-DPDP-06) — a documented retention schedule per data class.
  // No policy exists until an admin explicitly creates one; the purge job
  // (retention-purge.service.ts) does nothing for a class with no row.
  async findRetentionPolicies(user: JwtPayload) {
    return this.prisma.retentionPolicies.findMany({ where: orgScope(user), orderBy: { data_class: 'asc' } });
  }

  async setRetentionPolicy(input: RetentionPolicyInput, user: JwtPayload) {
    const orgId = orgIdForWrite(user, 'RetentionPolicy');
    if (!orgId) throw new BadRequestException('Cannot configure a retention policy without an organization');
    return this.prisma.retentionPolicies.upsert({
      where: { client_org_id_data_class: { client_org_id: orgId, data_class: input.data_class } },
      create: { client_org_id: orgId, data_class: input.data_class, retention_years: input.retention_years, legal_hold: input.legal_hold ?? false },
      update: { retention_years: input.retention_years, legal_hold: input.legal_hold ?? false },
    });
  }
}
