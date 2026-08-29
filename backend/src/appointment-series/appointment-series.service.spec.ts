import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentSeriesService } from './appointment-series.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AppointmentSeriesService', () => {
  let service: AppointmentSeriesService;
  let prisma: any;
  let appointmentsService: any;
  let patientsService: any;

  const managerA: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const managerB: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const patientCaller: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null, patient_id: 'pat-self' } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a' };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b' };

  const seriesRow = {
    id: 'series-1', client_org_id: 'org-a', clinic_id: 'clinic-a', patient_id: 'pat-1',
    name: '8-week physio', series_type: 'recurring', status: 'active',
    created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'), clinic: clinicA,
  };

  const baseInput = {
    name: '8-week physio',
    patient_id: 'pat-1',
    clinic_id: 'clinic-a',
    clinician_id: 'clin-1',
    series_type: 'recurring',
    occurrences: [
      { start_datetime: '2026-02-01T10:00:00.000Z', service_id: 'svc-1' },
      { start_datetime: '2026-02-08T10:00:00.000Z', service_id: 'svc-1' },
    ],
  };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      appointmentSeries: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      appointments: { findMany: jest.fn().mockResolvedValue([]) },
    };
    appointmentsService = {
      create: jest.fn(),
      cancel: jest.fn(),
      findBySeriesId: jest.fn().mockResolvedValue([]),
    };
    patientsService = {
      ownAndDependantPatientIds: jest.fn().mockResolvedValue(['pat-self']),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentSeriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentsService, useValue: appointmentsService },
        { provide: PatientsService, useValue: patientsService },
      ],
    }).compile();
    service = module.get(AppointmentSeriesService);
  });

  describe('create', () => {
    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(service.create(baseInput as any, managerA)).rejects.toThrow(BadRequestException);
      expect(prisma.appointmentSeries.create).not.toHaveBeenCalled();
    });

    it('rejects a patient booking a series for someone other than themselves/a dependant', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-self']);
      await expect(service.create({ ...baseInput, patient_id: 'someone-else' } as any, patientCaller)).rejects.toThrow(BadRequestException);
    });

    it('creates every occurrence through the existing AppointmentsService.create(), reusing its own validation', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.appointmentSeries.create.mockResolvedValue(seriesRow);
      appointmentsService.create.mockResolvedValue({ id: 'appt-x' });

      const result = await service.create(baseInput as any, managerA);

      expect(appointmentsService.create).toHaveBeenCalledTimes(2);
      expect(result.attempted_count).toBe(2);
      expect(result.created_count).toBe(2);
      expect(result.failed_count).toBe(0);
      expect(result.success).toBe(true);
      // Each inner create() call is passed the series link -- the whole
      // point of reusing create() rather than reimplementing validation.
      expect(appointmentsService.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ service_id: 'svc-1', clinician_id: 'clin-1' }),
        managerA,
        { series_id: 'series-1', series_occurrence_no: 1 },
      );
    });

    it('a genuine slot conflict on one occurrence does not abort the others (partial-success report, matches bulkReschedule)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.appointmentSeries.create.mockResolvedValue(seriesRow);
      appointmentsService.create
        .mockResolvedValueOnce({ id: 'appt-1' })
        .mockRejectedValueOnce(new BadRequestException('This time slot is no longer available'));

      const result = await service.create(baseInput as any, managerA);

      expect(result.created_count).toBe(1);
      expect(result.failed_count).toBe(1);
      expect(result.failures).toEqual([{ occurrence_index: 1, message: 'This time slot is no longer available' }]);
      expect(result.success).toBe(true); // at least one occurrence succeeded
    });

    it('derives a distinct, deterministic per-occurrence idempotency key from the outer key', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.appointmentSeries.create.mockResolvedValue(seriesRow);
      appointmentsService.create.mockResolvedValue({ id: 'appt-x' });

      await service.create({ ...baseInput, idempotency_key: 'outer-key' } as any, managerA);

      expect(appointmentsService.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ idempotency_key: 'outer-key:occ:0' }),
        managerA,
        expect.anything(),
      );
      expect(appointmentsService.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ idempotency_key: 'outer-key:occ:1' }),
        managerA,
        expect.anything(),
      );
    });
  });

  describe('findOne (tenant + self-scope)', () => {
    it('rejects a cross-org caller', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue(seriesRow);
      await expect(service.findOne('series-1', managerB)).rejects.toThrow(NotFoundException);
    });

    it('rejects a patient who is not this series\' own patient or a dependant', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue({ ...seriesRow, client_org_id: null, clinic: { ...clinicA, client_org_id: null } });
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['some-other-patient']);
      await expect(service.findOne('series-1', patientCaller)).rejects.toThrow(NotFoundException);
    });

    it('returns the series with its real occurrences for an in-scope caller', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue(seriesRow);
      appointmentsService.findBySeriesId.mockResolvedValue([{ id: 'appt-1' }, { id: 'appt-2' }]);
      const result = await service.findOne('series-1', managerA);
      expect(result.appointments).toHaveLength(2);
      expect(appointmentsService.findBySeriesId).toHaveBeenCalledWith('series-1', managerA);
    });
  });

  describe('cancel', () => {
    it('cancels only non-terminal occurrences, leaving a completed one untouched', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue(seriesRow);
      prisma.appointments.findMany.mockResolvedValue([{ id: 'appt-1' }, { id: 'appt-2' }]);
      appointmentsService.cancel.mockResolvedValue({});

      const result = await service.cancel({ series_id: 'series-1', reason: 'Patient request' } as any, managerA);

      expect(prisma.appointments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ series_id: 'series-1' }) }),
      );
      expect(appointmentsService.cancel).toHaveBeenCalledTimes(2);
      expect(result.cancelled_count).toBe(2);
      expect(prisma.appointmentSeries.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'series-1' }, data: expect.objectContaining({ status: 'cancelled' }) }),
      );
    });

    it('a failure cancelling one occurrence does not abort the others', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue(seriesRow);
      prisma.appointments.findMany.mockResolvedValue([{ id: 'appt-1' }, { id: 'appt-2' }]);
      appointmentsService.cancel.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('boom'));

      const result = await service.cancel({ series_id: 'series-1', reason: 'x' } as any, managerA);

      expect(result.cancelled_count).toBe(1);
      expect(result.failed_count).toBe(1);
    });

    it('rejects a cross-org caller', async () => {
      prisma.appointmentSeries.findUnique.mockResolvedValue(seriesRow);
      await expect(service.cancel({ series_id: 'series-1', reason: 'x' } as any, managerB)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('org-scopes by the caller\'s own client_org_id via the clinic relation', async () => {
      await service.list(undefined, managerA);
      expect(prisma.appointmentSeries.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });
  });
});
