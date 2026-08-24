import { Test, TestingModule } from '@nestjs/testing';
import { NoShowSweepService } from './no-show-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('NoShowSweepService', () => {
  let service: NoShowSweepService;
  let prisma: any;
  let appointmentsService: { markNoShow: jest.Mock };

  const clinic = { id: 'clinic-a', client_organization: { no_show_grace_minutes: 30 } };

  function appt(overrides: any = {}) {
    return {
      id: 'appt-1', patient_id: 'patient-1', status: 'confirmed', is_deleted: false,
      appointment_time: new Date('2026-08-25T09:00:00Z'),
      clinic,
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      appointments: { findMany: jest.fn() },
      patients: { update: jest.fn() },
    };
    appointmentsService = { markNoShow: jest.fn().mockResolvedValue({}) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoShowSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppointmentsService, useValue: appointmentsService },
      ],
    }).compile();
    service = module.get(NoShowSweepService);
    jest.useFakeTimers().setSystemTime(new Date('2026-08-25T09:45:00Z')); // 45 min after appointment_time
  });

  afterEach(() => jest.useRealTimers());

  it('marks an appointment past its org\'s grace period as no_show and increments the patient\'s count', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt()]);
    await service.sweep();
    expect(appointmentsService.markNoShow).toHaveBeenCalledWith('appt-1', expect.objectContaining({ sub: 'system', roles: ['admin'] }));
    expect(prisma.patients.update).toHaveBeenCalledWith({ where: { id: 'patient-1' }, data: { no_show_count: { increment: 1 } } });
  });

  it('leaves an appointment still within its grace period alone', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt({ clinic: { client_organization: { no_show_grace_minutes: 60 } } })]);
    await service.sweep();
    expect(appointmentsService.markNoShow).not.toHaveBeenCalled();
    expect(prisma.patients.update).not.toHaveBeenCalled();
  });

  it('uses a default grace period when the org has none configured', async () => {
    prisma.appointments.findMany.mockResolvedValue([appt({ clinic: { client_organization: null } })]);
    await service.sweep();
    // 45 min elapsed > 30-min default -> still marked.
    expect(appointmentsService.markNoShow).toHaveBeenCalled();
  });

  it('continues sweeping remaining rows if one fails', async () => {
    appointmentsService.markNoShow.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({});
    prisma.appointments.findMany.mockResolvedValue([appt({ id: 'appt-1' }), appt({ id: 'appt-2', patient_id: 'patient-2' })]);
    await service.sweep();
    expect(appointmentsService.markNoShow).toHaveBeenCalledTimes(2);
    expect(prisma.patients.update).toHaveBeenCalledTimes(1);
    expect(prisma.patients.update).toHaveBeenCalledWith({ where: { id: 'patient-2' }, data: { no_show_count: { increment: 1 } } });
  });

  it('only ever queries confirmed, non-deleted appointments', async () => {
    prisma.appointments.findMany.mockResolvedValue([]);
    await service.sweep();
    expect(prisma.appointments.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'confirmed', is_deleted: false },
    }));
  });
});
