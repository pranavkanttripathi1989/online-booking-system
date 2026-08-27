import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg, assertSameOrg } from '../common/scoping/tenant-scope';
import { RevenueShareRuleInput, ComputeMonthlyPayoutsInput } from './dto/revenue-share.input';

// REQ158 (P2-06). Resolution mirrors resolveServicePrice()'s own
// most-specific-wins cascade (resolve-price.ts): a clinician-level rule
// beats a clinic-level rule beats the org-level default. Kept as a small
// pure function, not a Prisma query, so it's cheap to unit test against
// an already-fetched rule list.
export interface ShareRuleRow {
  scope: string;
  clinic_id: string | null;
  clinician_id: string | null;
  share_percentage: number;
}

export function resolveRevenueShare(
  rules: ShareRuleRow[],
  clinicianId: string,
  clinicId: string,
): number | null {
  const clinicianRule = rules.find((r) => r.scope === 'clinician' && r.clinician_id === clinicianId);
  if (clinicianRule) return clinicianRule.share_percentage;

  const clinicRule = rules.find((r) => r.scope === 'clinic' && r.clinic_id === clinicId);
  if (clinicRule) return clinicRule.share_percentage;

  const orgRule = rules.find((r) => r.scope === 'org');
  if (orgRule) return orgRule.share_percentage;

  return null;
}

function monthRangeUtc(year: number, month: number) {
  const period_start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const period_end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));
  return { period_start, period_end };
}

@Injectable()
export class RevenueShareService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  private async assertClinicianInScope(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician || clinician.is_deleted) throw new BadRequestException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new BadRequestException('Clinician not found');
    return clinician;
  }

  private toRuleGraphQL(row: any) {
    return {
      id: row.id,
      scope: row.scope,
      clinic_id: row.clinic_id,
      clinician_id: row.clinician_id,
      share_percentage: row.share_percentage,
      clinic_name: row.clinic?.name ?? null,
      clinician_name: row.clinician ? `${row.clinician.first_name} ${row.clinician.last_name}` : null,
    };
  }

  async revenueShareRules(clinicId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.revenueShareRules.findMany({
      where: {
        ...orgScope(user),
        ...(clinicId ? { OR: [{ clinic_id: clinicId }, { scope: 'org' }, { clinic_id: null, scope: 'clinician' }] } : {}),
      },
      include: { clinic: true, clinician: true },
      orderBy: [{ scope: 'asc' }, { created_at: 'desc' }],
    });
    return rows.map((r) => this.toRuleGraphQL(r));
  }

  // Hard Rule 6: a create* mutation taking a caller-supplied clinic_id/
  // clinician_id must validate ownership before writing. No DB-unique
  // constraint spans the nullable scope columns (see the schema's own
  // comment), so "at most one rule per scope key" is enforced here via
  // find-then-upsert -- the same division of labour PayerTariffs' own
  // setPayerTariff uses for its natural key.
  async setRevenueShareRule(input: RevenueShareRuleInput, user: JwtPayload) {
    if (input.scope === 'clinic' && !input.clinic_id) {
      throw new BadRequestException('clinic_id is required for a clinic-level rule');
    }
    if (input.scope === 'clinician' && (!input.clinician_id || !input.clinic_id)) {
      throw new BadRequestException('clinic_id and clinician_id are required for a clinician-level rule');
    }

    let orgId: string | undefined;
    if (input.clinic_id) {
      const clinic = await this.assertClinicInScope(input.clinic_id, user);
      orgId = clinic.client_org_id ?? undefined;
    }
    if (input.clinician_id) {
      const clinician = await this.assertClinicianInScope(input.clinician_id, user);
      if (clinician.clinic_id !== input.clinic_id) {
        throw new BadRequestException('clinician_id does not belong to clinic_id');
      }
    }
    if (!orgId) {
      orgId = orgIdForWrite(user, 'RevenueShareRule');
    }
    if (!orgId) {
      throw new BadRequestException('Cannot record a revenue-share rule without an organization');
    }

    const existing = await this.prisma.revenueShareRules.findFirst({
      where: {
        client_org_id: orgId,
        scope: input.scope,
        clinic_id: input.scope === 'org' ? null : input.clinic_id ?? null,
        clinician_id: input.scope === 'clinician' ? input.clinician_id : null,
      },
    });

    const row = existing
      ? await this.prisma.revenueShareRules.update({
          where: { id: existing.id },
          data: { share_percentage: input.share_percentage },
          include: { clinic: true, clinician: true },
        })
      : await this.prisma.revenueShareRules.create({
          data: {
            client_org_id: orgId,
            scope: input.scope,
            clinic_id: input.scope === 'org' ? null : input.clinic_id ?? null,
            clinician_id: input.scope === 'clinician' ? input.clinician_id ?? null : null,
            share_percentage: input.share_percentage,
            created_by_user_id: user.sub,
          },
          include: { clinic: true, clinician: true },
        });

    return { success: true, userErrors: [], rule: this.toRuleGraphQL(row) };
  }

  private toPayoutGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      clinician_id: row.clinician_id,
      clinician_name: row.clinician ? `${row.clinician.first_name} ${row.clinician.last_name}` : '',
      period_start: row.period_start.toISOString(),
      period_end: row.period_end.toISOString(),
      gross_amount: row.gross_amount / 100,
      share_percentage_used: row.share_percentage_used,
      payout_amount: row.payout_amount / 100,
      appointment_count: row.appointment_count,
      status: row.status,
      approved_at: row.approved_at ? row.approved_at.toISOString() : null,
    };
  }

  async payouts(clinicId: string | undefined, year: number | undefined, month: number | undefined, user: JwtPayload) {
    const range = year && month ? monthRangeUtc(year, month) : null;
    const rows = await this.prisma.payouts.findMany({
      where: {
        ...orgScope(user),
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...(range ? { period_start: range.period_start } : {}),
      },
      include: { clinician: true },
      orderBy: [{ period_start: 'desc' }, { created_at: 'desc' }],
    });
    return rows.map((r) => this.toPayoutGraphQL(r));
  }

  // US-REV-02/US-REV-03. Sums succeeded AppointmentPayments in the given
  // calendar month for the given clinic, grouped by the paying
  // appointment's clinician, resolves each clinician's share rate, and
  // upserts one Payouts row per clinician -- but NEVER touches a row
  // already `status: 'approved'` (the approval-locking invariant this
  // slice exists to guarantee; only a pending_approval row is
  // recomputed in place, matching ClaimAppeals' own "re-rejection
  // regenerates the draft in place" precedent for a still-open state).
  async computeMonthlyPayouts(input: ComputeMonthlyPayoutsInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const orgId = clinic.client_org_id ?? orgIdForWrite(user, 'Payout');
    if (!orgId) throw new BadRequestException('Cannot compute payouts without an organization');

    const { period_start, period_end } = monthRangeUtc(input.year, input.month);

    const payments = await this.prisma.appointmentPayments.findMany({
      where: {
        clinic_id: input.clinic_id,
        status: 'succeeded',
        created_at: { gte: period_start, lt: period_end },
      },
      include: { appointment: { select: { clinician_id: true } } },
    });

    const byClinician = new Map<string, { gross: number; count: number }>();
    for (const p of payments) {
      const clinicianId = p.appointment.clinician_id;
      const entry = byClinician.get(clinicianId) ?? { gross: 0, count: 0 };
      entry.gross += p.amount - (p.discount_amount ?? 0);
      entry.count += 1;
      byClinician.set(clinicianId, entry);
    }

    if (byClinician.size === 0) {
      return { success: true, userErrors: [], payouts: [], skippedClinicianNames: [] };
    }

    const rules = await this.prisma.revenueShareRules.findMany({
      where: { client_org_id: orgId, OR: [{ scope: 'org' }, { scope: 'clinic', clinic_id: input.clinic_id }, { scope: 'clinician', clinic_id: input.clinic_id }] },
    });

    const clinicianIds = [...byClinician.keys()];
    const clinicians = await this.prisma.clinicians.findMany({ where: { id: { in: clinicianIds } } });
    const clinicianById = new Map(clinicians.map((c) => [c.id, c]));

    const results: any[] = [];
    const skippedNames: string[] = [];

    for (const [clinicianId, { gross, count }] of byClinician) {
      const pct = resolveRevenueShare(rules, clinicianId, input.clinic_id);
      const clinician = clinicianById.get(clinicianId);
      if (pct == null) {
        skippedNames.push(clinician ? `${clinician.first_name} ${clinician.last_name}` : clinicianId);
        continue;
      }

      const payoutAmount = Math.round((gross * pct) / 100);

      const existing = await this.prisma.payouts.findUnique({
        where: { clinician_id_clinic_id_period_start: { clinician_id: clinicianId, clinic_id: input.clinic_id, period_start } },
      });

      if (existing?.status === 'approved') {
        results.push(await this.prisma.payouts.findUnique({ where: { id: existing.id }, include: { clinician: true } }));
        continue;
      }

      const row = existing
        ? await this.prisma.payouts.update({
            where: { id: existing.id },
            data: { gross_amount: gross, share_percentage_used: pct, payout_amount: payoutAmount, appointment_count: count, computed_by_user_id: user.sub },
            include: { clinician: true },
          })
        : await this.prisma.payouts.create({
            data: {
              client_org_id: orgId,
              clinic_id: input.clinic_id,
              clinician_id: clinicianId,
              period_start,
              period_end,
              gross_amount: gross,
              share_percentage_used: pct,
              payout_amount: payoutAmount,
              appointment_count: count,
              computed_by_user_id: user.sub,
            },
            include: { clinician: true },
          });
      results.push(row);
    }

    return {
      success: true,
      userErrors: [],
      payouts: results.map((r) => this.toPayoutGraphQL(r)),
      skippedClinicianNames: skippedNames,
    };
  }

  async approvePayout(id: string, user: JwtPayload) {
    const payout = await this.prisma.payouts.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    assertSameOrg(user, payout.client_org_id, 'Payout');
    if (payout.status === 'approved') {
      const row = await this.prisma.payouts.findUnique({ where: { id }, include: { clinician: true } });
      return this.toPayoutGraphQL(row);
    }
    const row = await this.prisma.payouts.update({
      where: { id },
      data: { status: 'approved', approved_by_user_id: user.sub, approved_at: new Date() },
      include: { clinician: true },
    });
    return this.toPayoutGraphQL(row);
  }
}
