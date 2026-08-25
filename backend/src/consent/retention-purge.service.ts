import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// REQ034 (US-DPDP-06) — "given a retention period is configured per data
// class, an automated job purges data past that period unless a legal
// hold is active." Daily sweep, same @Cron pattern as NoShowSweepService/
// PriceHistorySweepService/LowStockSweepService.
//
// Deliberately soft-delete (is_deleted: true), not a hard SQL DELETE,
// matching this codebase's own established convention everywhere else
// (Patients/Drugs/Products/TestResults all use is_deleted, never a real
// row DELETE) — reversible if a policy turns out to have been misconfigured,
// which for an automated data-destruction job is a real, deliberate safety
// margin, not a corner cut.
//
// SUPPORTED_DATA_CLASSES is deliberately narrower than
// RETENTION_DATA_CLASSES (consent.input.ts) — 'clinical_records',
// 'consents', and 'messages' can all be stored as a real, documented
// policy (the requirement's own "documented retention schedule" half of
// the acceptance criterion), but this slice does not act on them yet:
// clinical records carry the exact statutory-retention-vs-erasure tension
// REQ034's own requirement doc flags for legal review before automating;
// Consents has no is_deleted column to safely soft-delete through at all;
// and Messages spans two people's own conversation, not one patient's
// record, which is a different deletion-scoping question this slice does
// not answer. Only test_results is enforced today.
const SUPPORTED_DATA_CLASSES = ['test_results'] as const;

@Injectable()
export class RetentionPurgeService {
  private readonly logger = new Logger(RetentionPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async sweep() {
    const policies = await this.prisma.retentionPolicies.findMany({
      where: { legal_hold: false, data_class: { in: SUPPORTED_DATA_CLASSES as unknown as string[] } },
    });

    for (const policy of policies) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - policy.retention_years);

      try {
        if (policy.data_class === 'test_results') {
          const { count } = await this.prisma.testResults.updateMany({
            where: {
              is_deleted: false,
              date_ordered: { lt: cutoff },
              ordered_by: { client_org_id: policy.client_org_id },
            },
            data: { is_deleted: true },
          });
          if (count > 0) {
            this.logger.log(`Retention purge: soft-deleted ${count} test_results row(s) for org ${policy.client_org_id} (older than ${policy.retention_years}y)`);
          }
        }
      } catch (err) {
        this.logger.error(`Retention purge failed for org ${policy.client_org_id}, data class ${policy.data_class}: ${(err as Error).message}`);
      }
    }
  }
}
