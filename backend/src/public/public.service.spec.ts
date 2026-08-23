import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: getAppointment (backs video/index.jsx's join
// page) had no ownership check at all -- any authenticated user could view
// any appointment's detail just by knowing/guessing its id.
describe('PublicService — getAppointment access scoping', () => {
  let service: PublicService;
  let prisma: { appointments: { findUnique: jest.Mock } };

  const appointmentRow = {
    id: 'appt-1', is_deleted: false, patient_id: 'pat-1', clinician_id: 'cln-1',
    appointment_time: new Date(), duration_minutes: 30, type: 'video', status: 'scheduled',
    clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y', clinician_type: 'GP', clinic: { client_org_id: 'org-1' } },
    patient: { id: 'pat-1', first_name: 'A', last_name: 'B' },
  };

  const ownPatient: JwtPayload = { sub: 'u-1', roles: ['patient'], client_org_id: null, patient_id: 'pat-1' } as JwtPayload;
  const otherPatient: JwtPayload = { sub: 'u-2', roles: ['patient'], client_org_id: null, patient_id: 'pat-2' } as JwtPayload;
  const ownClinician: JwtPayload = { sub: 'u-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const otherClinician: JwtPayload = { sub: 'u-4', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-2' } as JwtPayload;
  const orgStaff: JwtPayload = { sub: 'u-5', roles: ['staff'], client_org_id: 'org-1' } as JwtPayload;
  const otherOrgStaff: JwtPayload = { sub: 'u-6', roles: ['staff'], client_org_id: 'org-2' } as JwtPayload;
  const platformAdmin: JwtPayload = { sub: 'u-7', roles: ['admin'], client_org_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = { appointments: { findUnique: jest.fn().mockResolvedValue(appointmentRow) } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PublicService);
  });

  it('allows the patient on the appointment', async () => {
    await expect(service.getAppointment('appt-1', ownPatient)).resolves.toBeDefined();
  });

  it('rejects a different patient', async () => {
    await expect(service.getAppointment('appt-1', otherPatient)).rejects.toThrow(NotFoundException);
  });

  it('allows the clinician on the appointment', async () => {
    await expect(service.getAppointment('appt-1', ownClinician)).resolves.toBeDefined();
  });

  it('rejects a different clinician', async () => {
    await expect(service.getAppointment('appt-1', otherClinician)).rejects.toThrow(NotFoundException);
  });

  it('allows same-org staff', async () => {
    await expect(service.getAppointment('appt-1', orgStaff)).resolves.toBeDefined();
  });

  it('rejects different-org staff', async () => {
    await expect(service.getAppointment('appt-1', otherOrgStaff)).rejects.toThrow(NotFoundException);
  });

  it('allows a platform admin (org-less)', async () => {
    await expect(service.getAppointment('appt-1', platformAdmin)).resolves.toBeDefined();
  });
});

// P3.4: getClinicians() used to call reviews.aggregate() once per clinician
// in a .map() -- one extra round-trip per row. Now batches every
// clinician's rating into a single reviews.groupBy() call.
describe('PublicService — getClinicians rating batching (P3.4)', () => {
  let service: PublicService;
  let prisma: { clinicians: { findMany: jest.Mock }; reviews: { groupBy: jest.Mock } };

  const clinicianRow = (id: string) => ({
    id, first_name: 'A', last_name: 'B', clinician_type: 'GP', bio: null, is_active: true,
    clinic: { name: 'Clinic' }, clinicianLanguages: [], clinicianServices: [],
  });

  beforeEach(async () => {
    prisma = {
      clinicians: { findMany: jest.fn().mockResolvedValue([clinicianRow('cln-1'), clinicianRow('cln-2')]) },
      reviews: {
        groupBy: jest.fn().mockResolvedValue([
          { clinician_id: 'cln-1', _avg: { stars: 4.5 }, _count: { stars: 10 } },
          // cln-2 has zero reviews -- absent from groupBy's result entirely,
          // not a zero-count row. Must still resolve to {rating: undefined, reviews: 0}.
        ]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PublicService);
  });

  it('calls reviews.groupBy exactly once regardless of clinician count, not once per clinician', async () => {
    await service.getClinicians(undefined);
    expect(prisma.reviews.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.reviews.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinician_id: { in: ['cln-1', 'cln-2'] } }) }),
    );
  });

  it('maps each clinician to their own rating from the batched result', async () => {
    const result = await service.getClinicians(undefined);
    expect(result.find((c) => c.id === 'cln-1')).toMatchObject({ rating: 4.5, reviews: 10 });
  });

  it("a clinician absent from groupBy's result (zero reviews) gets reviews: 0, not undefined/crash", async () => {
    const result = await service.getClinicians(undefined);
    expect(result.find((c) => c.id === 'cln-2')).toMatchObject({ rating: undefined, reviews: 0 });
  });

  it('does not call reviews.groupBy at all when there are no clinicians', async () => {
    prisma.clinicians.findMany.mockResolvedValue([]);
    await service.getClinicians(undefined);
    expect(prisma.reviews.groupBy).not.toHaveBeenCalled();
  });
});
