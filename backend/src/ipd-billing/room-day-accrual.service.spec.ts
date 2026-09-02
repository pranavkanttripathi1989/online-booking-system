import { Test, TestingModule } from '@nestjs/testing';
import { RoomDayAccrualService } from './room-day-accrual.service';
import { IpdBillingService } from './ipd-billing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomDayAccrualService', () => {
  let service: RoomDayAccrualService;
  let prisma: any;
  let billingService: any;

  const wardA = { id: 'ward-a', name: 'Ward A', bed_charge_product_id: 'prod-bed', nursing_charge_product_id: null, bed_charge_product: { id: 'prod-bed' }, nursing_charge_product: null };
  const wardIcu = { id: 'ward-icu', name: 'ICU', bed_charge_product_id: 'prod-icu', nursing_charge_product_id: 'prod-nursing', bed_charge_product: { id: 'prod-icu' }, nursing_charge_product: { id: 'prod-nursing' } };

  const admission = {
    id: 'adm-a',
    is_deleted: false,
    clinic_id: 'clinic-a',
    admitted_at: new Date('2026-09-01T08:00:00Z'),
    discharged_at: null as Date | null,
  };

  const defaultSettings = {
    day_boundary_mode: 'calendar_day',
    discharge_cutoff_hour: 12,
    charge_admission_day: true,
    charge_discharge_day: false,
    transfer_day_rate_policy: 'higher_of',
    auto_post_room_charges: true,
  };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn().mockResolvedValue(admission) },
      bedOccupancies: { findMany: jest.fn().mockResolvedValue([]) },
    };
    billingService = {
      getSettingsRowOrDefault: jest.fn().mockResolvedValue(defaultSettings),
      priceProductForAdmission: jest.fn().mockResolvedValue(100000),
      postCharge: jest.fn().mockResolvedValue({ id: 'charge-1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomDayAccrualService, { provide: PrismaService, useValue: prisma }, { provide: IpdBillingService, useValue: billingService }],
    }).compile();
    service = module.get(RoomDayAccrualService);
  });

  it('does nothing when the clinic has auto_post_room_charges disabled', async () => {
    billingService.getSettingsRowOrDefault.mockResolvedValue({ ...defaultSettings, auto_post_room_charges: false });
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardA, start_at: admission.admitted_at, end_at: null }]);
    await service.accrueForAdmission('adm-a');
    expect(billingService.postCharge).not.toHaveBeenCalled();
  });

  it('does nothing when the admission has no occupancy rows', async () => {
    prisma.bedOccupancies.findMany.mockResolvedValue([]);
    await service.accrueForAdmission('adm-a');
    expect(billingService.postCharge).not.toHaveBeenCalled();
  });

  it('posts one room_day charge per day for a single-ward stay, skipping the un-configured nursing charge', async () => {
    const admitted = new Date('2026-09-01T08:00:00Z');
    const twoDaysLater = new Date('2026-09-03T08:00:00Z');
    prisma.admissions.findUnique.mockResolvedValue({ ...admission, admitted_at: admitted, discharged_at: null });
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardA, start_at: admitted, end_at: null }]);

    const realNow = Date.now;
    Date.now = () => twoDaysLater.getTime();
    try {
      await service.accrueForAdmission('adm-a');
    } finally {
      Date.now = realNow;
    }

    const roomCharges = billingService.postCharge.mock.calls.filter(([p]: any[]) => p.chargeType === 'room_day');
    const nursingCharges = billingService.postCharge.mock.calls.filter(([p]: any[]) => p.chargeType === 'nursing');
    expect(roomCharges.length).toBeGreaterThanOrEqual(2);
    expect(nursingCharges).toHaveLength(0);
  });

  it('posts both room_day and nursing charges when the ward configures both', async () => {
    prisma.admissions.findUnique.mockResolvedValue({ ...admission, discharged_at: null });
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardIcu, start_at: admission.admitted_at, end_at: null }]);
    await service.accrueForAdmission('adm-a');

    const roomCharges = billingService.postCharge.mock.calls.filter(([p]: any[]) => p.chargeType === 'room_day');
    const nursingCharges = billingService.postCharge.mock.calls.filter(([p]: any[]) => p.chargeType === 'nursing');
    expect(roomCharges.length).toBeGreaterThanOrEqual(1);
    expect(nursingCharges.length).toBeGreaterThanOrEqual(1);
    expect(nursingCharges[0][0].productId).toBe('prod-nursing');
  });

  it('skips the admission day when charge_admission_day is false', async () => {
    billingService.getSettingsRowOrDefault.mockResolvedValue({ ...defaultSettings, charge_admission_day: false });
    const admitted = new Date('2026-09-01T08:00:00Z');
    prisma.admissions.findUnique.mockResolvedValue({ ...admission, admitted_at: admitted, discharged_at: admitted });
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardA, start_at: admitted, end_at: admitted }]);
    await service.accrueForAdmission('adm-a');
    expect(billingService.postCharge).not.toHaveBeenCalled();
  });

  it('is idempotent -- running the sweep twice against the same day is safe (a caught unique-violation is swallowed, not surfaced)', async () => {
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardA, start_at: admission.admitted_at, end_at: null }]);
    billingService.postCharge.mockRejectedValue(new Error('conflicting key value violates exclusion constraint "ipd_charges_room_day_once_per_occupancy_day"'));
    await expect(service.accrueForAdmission('adm-a')).resolves.toBeUndefined();
  });

  it('re-throws a genuinely different error rather than swallowing it', async () => {
    prisma.bedOccupancies.findMany.mockResolvedValue([{ id: 'occ-1', ward: wardA, start_at: admission.admitted_at, end_at: null }]);
    billingService.postCharge.mockRejectedValue(new Error('connection reset'));
    await expect(service.accrueForAdmission('adm-a')).rejects.toThrow('connection reset');
  });

  it('chooses the higher-priced ward on a transfer day under the default higher_of policy', async () => {
    // Both segments fall inside the SAME day-boundary window (cutoffHour
    // noon UTC): [Sep1 12:00, Sep2 12:00). Transfer happens mid-window, at
    // Sep2 00:00 -- exactly the shape a real mid-day transfer takes.
    const transferAt = new Date('2026-09-02T00:00:00Z');
    prisma.admissions.findUnique.mockResolvedValue({ ...admission, admitted_at: admission.admitted_at, discharged_at: null });
    prisma.bedOccupancies.findMany.mockResolvedValue([
      { id: 'occ-1', ward: wardA, start_at: admission.admitted_at, end_at: transferAt },
      { id: 'occ-2', ward: wardIcu, start_at: transferAt, end_at: null },
    ]);
    billingService.priceProductForAdmission.mockImplementation((productId: string) => Promise.resolve(productId === 'prod-icu' ? 500000 : 100000));

    const realNow = Date.now;
    Date.now = () => new Date('2026-09-02T06:00:00Z').getTime();
    try {
      await service.accrueForAdmission('adm-a');
    } finally {
      Date.now = realNow;
    }

    const roomCharges = billingService.postCharge.mock.calls.filter(([p]: any[]) => p.chargeType === 'room_day');
    // Exactly one room_day charge per window even though two segments
    // overlapped it -- never a double-charge on a transfer day.
    const windowsCovered = new Set(roomCharges.map(([p]: any[]) => p.serviceDate.getTime()));
    expect(roomCharges.length).toBe(windowsCovered.size);
    // The window containing the transfer picked the pricier (ICU) segment.
    const transferWindowCharge = roomCharges.find(([p]: any[]) => p.bedOccupancyId === 'occ-2');
    expect(transferWindowCharge).toBeDefined();
    expect(transferWindowCharge![0].productId).toBe('prod-icu');
  });
});
