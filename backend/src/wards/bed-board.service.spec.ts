import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BedBoardService } from './bed-board.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('BedBoardService', () => {
  let service: BedBoardService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', is_deleted: false, client_org_id: 'org-a' };

  beforeEach(async () => {
    prisma = { clinics: { findUnique: jest.fn() }, beds: { findMany: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BedBoardService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BedBoardService);
  });

  it('rejects a clinic from a different org', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    await expect(service.bedBoard({ clinic_id: 'clinic-a' } as any, orgBUser)).rejects.toThrow(BadRequestException);
    expect(prisma.beds.findMany).not.toHaveBeenCalled();
  });

  it('maps an occupied bed to its live admission, and a hold to its reason', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    prisma.beds.findMany.mockResolvedValue([
      {
        id: 'bed-1',
        bed_number: 'A-01',
        status: 'occupied',
        ward_id: 'ward-1',
        ward: { name: 'Ward A', ward_type: 'general', floor: '2' },
        occupancies: [
          {
            reason: null,
            occupancy_kind: 'occupied',
            end_at: null,
            admission: {
              id: 'adm-1',
              admission_number: 'ADM/2026-27/CLINICA/00001',
              patient_id: 'pat-1',
              admitted_at: new Date('2026-09-01'),
              expected_discharge_at: null,
              is_mlc: false,
              is_critical: true,
              patient: { first_name: 'Jane', last_name: 'Doe' },
              attending_clinician: { first_name: 'Sam', last_name: 'Rao' },
            },
          },
        ],
      },
      {
        id: 'bed-2',
        bed_number: 'A-02',
        status: 'cleaning',
        ward_id: 'ward-1',
        ward: { name: 'Ward A', ward_type: 'general', floor: '2' },
        occupancies: [{ reason: 'Post-discharge turnaround', occupancy_kind: 'cleaning', end_at: null, admission: null }],
      },
      {
        id: 'bed-3',
        bed_number: 'A-03',
        status: 'available',
        ward_id: 'ward-1',
        ward: { name: 'Ward A', ward_type: 'general', floor: '2' },
        occupancies: [],
      },
    ]);

    const board = await service.bedBoard({ clinic_id: 'clinic-a' } as any, orgAUser);

    const occupied = board.entries.find((e) => e.bed_number === 'A-01');
    expect(occupied?.patient_name).toBe('Jane Doe');
    expect(occupied?.attending_clinician_name).toBe('Sam Rao');
    expect(occupied?.admission_number).toBe('ADM/2026-27/CLINICA/00001');
    expect(occupied?.is_critical).toBe(true);

    const cleaning = board.entries.find((e) => e.bed_number === 'A-02');
    expect(cleaning?.hold_reason).toBe('Post-discharge turnaround');
    expect(cleaning?.patient_name).toBeUndefined();

    expect(board.summary.total).toBe(3);
    expect(board.summary.occupied).toBe(1);
    expect(board.summary.cleaning).toBe(1);
    expect(board.summary.available).toBe(1);
  });

  it('excludes blocked beds from the occupancy-rate denominator', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'occupied', ward_id: 'w', ward: { name: 'W', ward_type: 'general' }, occupancies: [] },
      { id: 'b2', bed_number: '2', status: 'occupied', ward_id: 'w', ward: { name: 'W', ward_type: 'general' }, occupancies: [] },
      { id: 'b3', bed_number: '3', status: 'blocked', ward_id: 'w', ward: { name: 'W', ward_type: 'general' }, occupancies: [] },
      { id: 'b4', bed_number: '4', status: 'blocked', ward_id: 'w', ward: { name: 'W', ward_type: 'general' }, occupancies: [] },
    ]);
    // 2 occupied out of (4 total - 2 blocked) = 100%, not 50%.
    const board = await service.bedBoard({ clinic_id: 'clinic-a' } as any, orgAUser);
    expect(board.summary.occupancy_rate).toBe(100);
  });

  it('returns 0% occupancy rather than dividing by zero when every bed is blocked', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    prisma.beds.findMany.mockResolvedValue([
      { id: 'b1', bed_number: '1', status: 'blocked', ward_id: 'w', ward: { name: 'W', ward_type: 'general' }, occupancies: [] },
    ]);
    const board = await service.bedBoard({ clinic_id: 'clinic-a' } as any, orgAUser);
    expect(board.summary.occupancy_rate).toBe(0);
  });
});
