import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ScheduledReportsService } from './scheduled-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ029 (US-RPT-03) — the behaviour under test that matters most:
// deliverDueReports respects each schedule's own cadence against
// last_sent_at (never sends early), and a report never scheduled before
// (last_sent_at null) is always due.
describe('ScheduledReportsService', () => {
  let service: ScheduledReportsService;
  let prisma: { scheduledReports: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; findUnique: jest.Mock } };
  let analyticsService: { getAppointmentStats: jest.Mock; getPatientReportGroup: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = { scheduledReports: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() } };
    analyticsService = { getAppointmentStats: jest.fn().mockResolvedValue({}), getPatientReportGroup: jest.fn().mockResolvedValue({}) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();
    service = module.get(ScheduledReportsService);
  });

  it('rejects deactivating a cross-org schedule', async () => {
    prisma.scheduledReports.findUnique.mockResolvedValue({ id: 's1', client_org_id: 'org-b' });
    await expect(service.deactivate('s1', orgAUser)).rejects.toThrow(BadRequestException);
    expect(prisma.scheduledReports.update).not.toHaveBeenCalled();
  });

  describe('deliverDueReports', () => {
    const baseRow = { id: 's1', client_org_id: 'org-a', clinic_id: null, report_type: 'daily_collections', recipients_json: ['a@x.test'], cadence: 'daily', channel: 'email', is_active: true };

    it('delivers (and updates last_sent_at) a schedule that has never been sent', async () => {
      prisma.scheduledReports.findMany.mockResolvedValue([{ ...baseRow, last_sent_at: null }]);
      prisma.scheduledReports.update.mockResolvedValue({});
      await service.deliverDueReports();
      expect(analyticsService.getAppointmentStats).toHaveBeenCalled();
      expect(prisma.scheduledReports.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { last_sent_at: expect.any(Date) } });
    });

    it('skips a daily schedule already sent within the last 24 hours', async () => {
      const sentRecently = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      prisma.scheduledReports.findMany.mockResolvedValue([{ ...baseRow, last_sent_at: sentRecently }]);
      await service.deliverDueReports();
      expect(analyticsService.getAppointmentStats).not.toHaveBeenCalled();
      expect(prisma.scheduledReports.update).not.toHaveBeenCalled();
    });

    it('delivers a daily schedule last sent over 24 hours ago', async () => {
      const sentYesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
      prisma.scheduledReports.findMany.mockResolvedValue([{ ...baseRow, last_sent_at: sentYesterday }]);
      prisma.scheduledReports.update.mockResolvedValue({});
      await service.deliverDueReports();
      expect(prisma.scheduledReports.update).toHaveBeenCalled();
    });

    it('routes patient_report_group report_type to getPatientReportGroup, not getAppointmentStats', async () => {
      prisma.scheduledReports.findMany.mockResolvedValue([{ ...baseRow, report_type: 'patient_report_group', last_sent_at: null }]);
      prisma.scheduledReports.update.mockResolvedValue({});
      await service.deliverDueReports();
      expect(analyticsService.getPatientReportGroup).toHaveBeenCalled();
      expect(analyticsService.getAppointmentStats).not.toHaveBeenCalled();
    });

    it('does not let one report failing to compute stop the others from being attempted', async () => {
      analyticsService.getAppointmentStats.mockRejectedValueOnce(new Error('boom'));
      prisma.scheduledReports.findMany.mockResolvedValue([
        { ...baseRow, id: 's1', last_sent_at: null },
        { ...baseRow, id: 's2', last_sent_at: null },
      ]);
      prisma.scheduledReports.update.mockResolvedValue({});
      await expect(service.deliverDueReports()).resolves.not.toThrow();
      expect(prisma.scheduledReports.update).toHaveBeenCalledWith({ where: { id: 's2' }, data: { last_sent_at: expect.any(Date) } });
    });
  });
});
