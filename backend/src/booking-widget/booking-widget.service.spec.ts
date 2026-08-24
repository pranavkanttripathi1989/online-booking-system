import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BookingWidgetService } from './booking-widget.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ018 (US-BOOK-05). Own client_org_id, same shape as DepartmentsService.
describe('BookingWidgetService', () => {
  let service: BookingWidgetService;
  let prisma: {
    bookingWidgetConfig: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    clinics: { findUnique: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };
  const configA = { id: 'cfg-a', client_org_id: 'org-a', clinic_id: 'clinic-a', allowed_origins: ['https://a.test'], short_link_slug: 'slug-a', is_active: true, clinic: clinicA };
  const configB = { ...configA, id: 'cfg-b', client_org_id: 'org-b', clinic_id: 'clinic-b', short_link_slug: 'slug-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      bookingWidgetConfig: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      clinics: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingWidgetService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BookingWidgetService);
  });

  it('scopes findAll to the caller org', async () => {
    prisma.bookingWidgetConfig.findMany.mockResolvedValue([]);
    await service.findAll(orgAUser);
    expect(prisma.bookingWidgetConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
    );
  });

  it('rejects reading a cross-org config', async () => {
    prisma.bookingWidgetConfig.findUnique.mockResolvedValue(configB);
    await expect(service.findOne('cfg-b', orgAUser)).rejects.toThrow(NotFoundException);
  });

  it('rejects create when an org-less platform operator has no organization to stamp', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    const result = await service.create({ clinic_id: 'clinic-a', allowed_origins: ['https://a.test'] } as any, platformUser);
    expect(result.success).toBe(false);
    expect(prisma.bookingWidgetConfig.create).not.toHaveBeenCalled();
  });

  it('rejects a clinic_id belonging to a different org (Hard Rule 6)', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicB);
    const result = await service.create({ clinic_id: 'clinic-b', allowed_origins: ['https://a.test'] } as any, orgAUser);
    expect(result.success).toBe(false);
    expect(prisma.bookingWidgetConfig.create).not.toHaveBeenCalled();
  });

  it('creates with a random slug when none is supplied', async () => {
    prisma.clinics.findUnique.mockResolvedValue(clinicA);
    prisma.bookingWidgetConfig.findUnique.mockResolvedValue(null);
    prisma.bookingWidgetConfig.create.mockResolvedValue(configA);
    const result = await service.create({ clinic_id: 'clinic-a', allowed_origins: ['https://a.test'] } as any, orgAUser);
    expect(result.success).toBe(true);
    expect(prisma.bookingWidgetConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
    );
  });

  it('rejects deactivating a cross-org config', async () => {
    prisma.bookingWidgetConfig.findUnique.mockResolvedValue(configB);
    const result = await service.deactivate('cfg-b', orgAUser);
    expect(result.success).toBe(false);
    expect(prisma.bookingWidgetConfig.update).not.toHaveBeenCalled();
  });

  describe('isOriginAllowed', () => {
    it('returns false for an inactive config', async () => {
      prisma.bookingWidgetConfig.findUnique.mockResolvedValue({ ...configA, is_active: false });
      expect(await service.isOriginAllowed('slug-a', 'https://a.test')).toBe(false);
    });

    it('returns true only for an allowlisted origin', async () => {
      prisma.bookingWidgetConfig.findUnique.mockResolvedValue(configA);
      expect(await service.isOriginAllowed('slug-a', 'https://a.test')).toBe(true);
      expect(await service.isOriginAllowed('slug-a', 'https://evil.test')).toBe(false);
    });
  });
});
