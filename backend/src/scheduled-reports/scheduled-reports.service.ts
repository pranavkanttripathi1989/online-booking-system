import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ScheduledReportInput } from './dto/scheduled-report.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';

const DAY_MS = 24 * 60 * 60 * 1000;
const CADENCE_MS: Record<string, number> = { daily: DAY_MS, weekly: 7 * DAY_MS, monthly: 30 * DAY_MS };

// REQ029 (US-RPT-03) — scheduled report delivery. Actual sends are
// stubbed (console.log) the same way OTP SMS already is in this dev
// environment (auth.service.ts's own "[OTP STUB]" convention) — no real
// AWS SES integration exists anywhere in this codebase yet to send a real
// email through. The report-computation and cadence-tracking (this is the
// genuinely new part) are real: the cron finds every due schedule, calls
// the real AnalyticsService for that org/clinic's real numbers, and
// updates last_sent_at — only the transport is a stand-in.
@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  private toGraphQL(row: any) {
    const { recipients_json, client_org_id, ...rest } = row;
    return { ...rest, recipients: Array.isArray(recipients_json) ? recipients_json : [] };
  }

  async findAll(user: JwtPayload) {
    const rows = await this.prisma.scheduledReports.findMany({ where: { ...orgScope(user) }, orderBy: { created_at: 'desc' } });
    return rows.map((r) => this.toGraphQL(r));
  }

  async create(input: ScheduledReportInput, user: JwtPayload) {
    const orgId = orgIdForWrite(user, 'ScheduledReport');
    if (!orgId) throw new BadRequestException('Cannot schedule a report without an organization');
    const row = await this.prisma.scheduledReports.create({
      data: {
        client_org_id: orgId,
        clinic_id: input.clinic_id,
        report_type: input.report_type,
        recipients_json: input.recipients,
        cadence: input.cadence,
        channel: input.channel,
        created_by_user_id: user.sub,
      },
    });
    return this.toGraphQL(row);
  }

  async deactivate(id: string, user: JwtPayload) {
    const existing = await this.prisma.scheduledReports.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Scheduled report not found');
    if (!isSameOrg(user, existing.client_org_id)) throw new BadRequestException('Scheduled report not found');
    const row = await this.prisma.scheduledReports.update({ where: { id }, data: { is_active: false } });
    return this.toGraphQL(row);
  }

  private async computeReportSnapshot(reportType: string, clinicId: string | undefined, user: JwtPayload) {
    const end = new Date();
    const start = new Date(end.getTime() - DAY_MS);
    if (reportType === 'patient_report_group') {
      return this.analyticsService.getPatientReportGroup(clinicId, start.toISOString(), end.toISOString(), 90, user);
    }
    return this.analyticsService.getAppointmentStats(clinicId, start.toISOString(), end.toISOString(), user);
  }

  // Runs hourly and checks each active schedule's own cadence against
  // last_sent_at, rather than one cron per cadence — a single small table,
  // no need for three separate scheduled methods.
  @Cron('0 * * * *')
  async deliverDueReports() {
    const dueReports = await this.prisma.scheduledReports.findMany({ where: { is_active: true } });
    for (const report of dueReports) {
      const intervalMs = CADENCE_MS[report.cadence] ?? DAY_MS;
      if (report.last_sent_at && Date.now() - report.last_sent_at.getTime() < intervalMs) continue;
      await this.deliverOne(report);
    }
  }

  private async deliverOne(report: { id: string; client_org_id: string; clinic_id: string | null; report_type: string; recipients_json: unknown; channel: string }) {
    // A platform-operator-shaped JwtPayload scoped to this report's own
    // org — the cron has no real caller, so it constructs the minimal
    // payload orgScope()/orgScopeVia() need.
    const syntheticUser = { sub: 'system', roles: ['admin'], client_org_id: report.client_org_id, patient_id: null, clinician_id: null } as JwtPayload;
    try {
      const snapshot = await this.computeReportSnapshot(report.report_type, report.clinic_id ?? undefined, syntheticUser);
      const recipients = Array.isArray(report.recipients_json) ? (report.recipients_json as string[]) : [];
      this.logger.log(`[REPORT DELIVERY STUB] Would send '${report.report_type}' report to ${recipients.join(', ')} via ${report.channel}: ${JSON.stringify(snapshot)}`);
      await this.prisma.scheduledReports.update({ where: { id: report.id }, data: { last_sent_at: new Date() } });
    } catch (err) {
      this.logger.error(`Failed to compute/deliver scheduled report ${report.id}`, err as Error);
    }
  }
}
