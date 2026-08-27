import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { PrismaService } from '../prisma/prisma.service';
import { SlotHoldsService } from '../slot-holds/slot-holds.service';
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
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        // P1-05: PublicService now depends on SlotHoldsService too -- a real,
        // no-op-by-default stub here since none of these pre-existing describe
        // blocks exercise hold/release/held-slot behaviour (see the dedicated
        // describe block below for that).
        { provide: SlotHoldsService, useValue: { holdSlot: jest.fn(), releaseSlot: jest.fn(), consumeIfOwned: jest.fn(), listHeldStartTimesForDay: jest.fn().mockResolvedValue([]) } },
      ],
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
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        // P1-05: PublicService now depends on SlotHoldsService too -- a real,
        // no-op-by-default stub here since none of these pre-existing describe
        // blocks exercise hold/release/held-slot behaviour (see the dedicated
        // describe block below for that).
        { provide: SlotHoldsService, useValue: { holdSlot: jest.fn(), releaseSlot: jest.fn(), consumeIfOwned: jest.fn(), listHeldStartTimesForDay: jest.fn().mockResolvedValue([]) } },
      ],
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

// REQ017 — bookPatientAppointment is this dialect's own, separate
// appointment-creation path from AppointmentsService.create() (see
// CLAUDE.md's note on the two GraphQL dialects being kept deliberately
// separate) — session/token mode logic is duplicated here, not shared, so
// it needs its own coverage rather than relying on appointments.service.spec.ts.
describe('PublicService — bookPatientAppointment session mode (REQ017)', () => {
  let service: PublicService;
  let prisma: {
    clinicians: { findUnique: jest.Mock };
    productVariations: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    patients: { findFirst: jest.Mock; create: jest.Mock };
    clinicianAvailability: { findFirst: jest.Mock };
    appointments: { findFirst: jest.Mock; count: jest.Mock; create: jest.Mock };
    rooms: { findFirst: jest.Mock; findUnique: jest.Mock };
    $executeRawUnsafe: jest.Mock;
    $transaction: jest.Mock;
  };

  const baseInput = {
    clinicianId: 'cln-1', productId: 'svc-1', date: '2026-08-24', startTime: '18:00',
    patientId: 'pat-1',
  };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue({ id: 'cln-1', clinic_id: 'clinic-1' }) },
      productVariations: { findUnique: jest.fn().mockResolvedValue(null) },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 15 }) },
      patients: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      // Default: no session/hybrid window, so pre-existing slot-mode tests
      // (if any are added later) keep exercising slot mode unchanged.
      clinicianAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
      appointments: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'appt-new' }),
      },
      rooms: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'room-1' }) },
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        // P1-05: PublicService now depends on SlotHoldsService too -- a real,
        // no-op-by-default stub here since none of these pre-existing describe
        // blocks exercise hold/release/held-slot behaviour (see the dedicated
        // describe block below for that).
        { provide: SlotHoldsService, useValue: { holdSlot: jest.fn(), releaseSlot: jest.fn(), consumeIfOwned: jest.fn(), listHeldStartTimesForDay: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    service = module.get(PublicService);
  });

  const sessionWindow = { mode: 'session', capacity: 40, overbook_allowance: 3, room_id: null };

  it('does not run the naive equality conflict check for a session-mode booking', async () => {
    prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
    await service.bookPatientAppointment(baseInput as any);
    expect(prisma.appointments.findFirst).not.toHaveBeenCalled();
  });

  it('assigns sequential token_no from the current booked count', async () => {
    prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
    prisma.appointments.count.mockResolvedValue(7);
    await service.bookPatientAppointment(baseInput as any);
    expect(prisma.appointments.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ booking_mode: 'session', token_no: 8 }) }),
    );
  });

  it('rejects once capacity + overbook_allowance is reached', async () => {
    prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
    prisma.appointments.count.mockResolvedValue(43);
    await expect(service.bookPatientAppointment(baseInput as any)).rejects.toThrow('This session is fully booked');
    expect(prisma.appointments.create).not.toHaveBeenCalled();
  });

  it('still runs the slot-conflict check for an ordinary slot-mode booking (regression)', async () => {
    await service.bookPatientAppointment(baseInput as any);
    expect(prisma.appointments.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ booking_mode: 'slot' }) }),
    );
    expect(prisma.appointments.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ booking_mode: 'slot', token_no: undefined }) }),
    );
  });
});

// P1-05 (BOOK-2, BOOK-3) — public/patient-self-serve dialect's own twin of
// AppointmentsService's create() coverage.
describe('PublicService — idempotency key & slot hold (P1-05)', () => {
  let service: PublicService;
  let prisma: {
    clinicians: { findUnique: jest.Mock };
    productVariations: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    patients: { findFirst: jest.Mock; create: jest.Mock };
    clinicianAvailability: { findFirst: jest.Mock };
    appointments: { findFirst: jest.Mock; count: jest.Mock; create: jest.Mock; findMany: jest.Mock };
    appointmentIdempotencyKeys: { findUnique: jest.Mock; create: jest.Mock };
    rooms: { findFirst: jest.Mock; findUnique: jest.Mock };
    $executeRawUnsafe: jest.Mock;
    $transaction: jest.Mock;
  };
  let slotHoldsService: { holdSlot: jest.Mock; releaseSlot: jest.Mock; consumeIfOwned: jest.Mock; listHeldStartTimesForDay: jest.Mock };

  const baseInput = { clinicianId: 'cln-1', productId: 'svc-1', date: '2026-08-24', startTime: '18:00', patientId: 'pat-1' };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue({ id: 'cln-1', clinic_id: 'clinic-1' }) },
      productVariations: { findUnique: jest.fn().mockResolvedValue(null) },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 15 }) },
      patients: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      clinicianAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
      appointments: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'appt-new' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      appointmentIdempotencyKeys: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      rooms: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'room-1' }) },
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: SlotHoldsService,
          useValue: (slotHoldsService = {
            holdSlot: jest.fn(),
            releaseSlot: jest.fn(),
            consumeIfOwned: jest.fn(),
            listHeldStartTimesForDay: jest.fn().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();
    service = module.get(PublicService);
  });

  describe('bookPatientAppointment', () => {
    it('short-circuits to the original appointment on a repeat idempotencyKey, before any lookup runs', async () => {
      prisma.appointmentIdempotencyKeys.findUnique.mockResolvedValueOnce({ idempotency_key: 'key-1', appointment_id: 'appt-existing' });
      const result = await service.bookPatientAppointment({ ...baseInput, idempotencyKey: 'key-1' } as any);
      expect(result).toEqual({ id: 'appt-existing' });
      expect(prisma.clinicians.findUnique).not.toHaveBeenCalled();
    });

    it('writes the idempotency key row inside the same transaction as a first-time successful create', async () => {
      await service.bookPatientAppointment({ ...baseInput, idempotencyKey: 'key-2' } as any);
      expect(prisma.appointmentIdempotencyKeys.create).toHaveBeenCalledWith({ data: { idempotency_key: 'key-2', appointment_id: 'appt-new' } });
    });

    it('never writes a key row when none was supplied (unchanged, pre-existing behaviour)', async () => {
      await service.bookPatientAppointment(baseInput as any);
      expect(prisma.appointmentIdempotencyKeys.create).not.toHaveBeenCalled();
    });

    it('consumes the hold that led to a successful booking', async () => {
      await service.bookPatientAppointment({ ...baseInput, holdToken: 'hold-1' } as any);
      expect(slotHoldsService.consumeIfOwned).toHaveBeenCalledWith('cln-1', expect.any(String), 'hold-1');
    });

    it('never touches the hold service when no holdToken was supplied (unchanged, pre-existing behaviour)', async () => {
      await service.bookPatientAppointment(baseInput as any);
      expect(slotHoldsService.consumeIfOwned).not.toHaveBeenCalled();
    });
  });

  describe('holdSlot / releaseSlot', () => {
    it('holdSlot composes date+startTime into the ISO instant SlotHoldsService expects', async () => {
      slotHoldsService.holdSlot.mockResolvedValue({ holdToken: 'tok', expiresAt: new Date() });
      await service.holdSlot('cln-1', '2026-10-15', '09:00');
      expect(slotHoldsService.holdSlot).toHaveBeenCalledWith('cln-1', '2026-10-15T09:00:00.000Z');
    });

    it('releaseSlot composes the same way and always resolves true', async () => {
      const result = await service.releaseSlot('cln-1', '2026-10-15', '09:00', 'tok');
      expect(slotHoldsService.releaseSlot).toHaveBeenCalledWith('cln-1', '2026-10-15T09:00:00.000Z', 'tok');
      expect(result).toBe(true);
    });
  });

  describe('getAppointments — held slots surface as unavailable (BOOK-2)', () => {
    it('appends a synthetic entry for every actively-held start time, alongside real booked rows', async () => {
      prisma.appointments.findMany.mockResolvedValue([
        { id: 'appt-1', appointment_time: new Date('2026-10-15T08:00:00.000Z'), duration_minutes: 30 },
      ]);
      slotHoldsService.listHeldStartTimesForDay.mockResolvedValue(['2026-10-15T09:00:00.000Z']);
      const result = await service.getAppointments('cln-1', '2026-10-15');
      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.id)).toEqual(['appt-1', 'held:2026-10-15T09:00:00.000Z']);
    });

    it('returns only real booked rows when nothing is currently held', async () => {
      prisma.appointments.findMany.mockResolvedValue([
        { id: 'appt-1', appointment_time: new Date('2026-10-15T08:00:00.000Z'), duration_minutes: 30 },
      ]);
      const result = await service.getAppointments('cln-1', '2026-10-15');
      expect(result).toHaveLength(1);
    });
  });
});

// P1-06 — getClinician() (the single-profile query backing
// doctor-profile.jsx) never carried rating/reviews at all before this
// slice, unlike its sibling getClinicians() listing query.
describe('PublicService — getClinician rating (P1-06)', () => {
  let service: PublicService;
  let prisma: {
    clinicians: { findUnique: jest.Mock };
    reviews: { aggregate: jest.Mock };
  };

  const clinicianRow = {
    id: 'cln-1', first_name: 'A', last_name: 'B', clinician_type: 'GP', bio: null, is_deleted: false,
    clinic: null, clinicianLanguages: [], clinicianServices: [],
  };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue(clinicianRow) },
      reviews: { aggregate: jest.fn().mockResolvedValue({ _avg: { stars: 4.2 }, _count: { stars: 7 } }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlotHoldsService, useValue: { holdSlot: jest.fn(), releaseSlot: jest.fn(), consumeIfOwned: jest.fn(), listHeldStartTimesForDay: jest.fn() } },
      ],
    }).compile();
    service = module.get(PublicService);
  });

  it('includes the real rating/review count from the same aggregate the listing query uses', async () => {
    const result = await service.getClinician('cln-1');
    expect(result.rating).toBe(4.2);
    expect(result.reviews).toBe(7);
  });

  it('a clinician with zero reviews gets {rating: undefined, reviews: 0}, not a crash', async () => {
    prisma.reviews.aggregate.mockResolvedValue({ _avg: { stars: null }, _count: { stars: 0 } });
    const result = await service.getClinician('cln-1');
    expect(result.rating).toBeUndefined();
    expect(result.reviews).toBe(0);
  });
});
