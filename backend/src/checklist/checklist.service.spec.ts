import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistService } from './checklist.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ChecklistService', () => {
  let service: ChecklistService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const itemA = {
    id: 'item-a1', clinic_id: 'clinic-a', product_id: null, label: 'Consent form',
    is_required: true, sort_order: 0, is_deleted: false, clinic: clinicA,
  };
  const itemB = { ...itemA, id: 'item-b1', clinic_id: 'clinic-b', clinic: clinicB };

  const appointmentA = { id: 'appt-a1', clinic_id: 'clinic-a', product_id: null, is_deleted: false, clinic: clinicA };
  const appointmentB = { id: 'appt-b1', clinic_id: 'clinic-b', product_id: null, is_deleted: false, clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      checklistItems: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      checklistCompletions: { findMany: jest.fn(), upsert: jest.fn() },
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
      appointments: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChecklistService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ChecklistService);
  });

  describe('list', () => {
    it('returns items for a clinic in the caller\'s org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.checklistItems.findMany.mockResolvedValue([itemA]);
      const result = await service.list('clinic-a', undefined, orgAUser);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-a1');
    });

    it('returns empty for a cross-org clinic, not the other org\'s items', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.list('clinic-b', undefined, orgAUser);
      expect(result).toEqual([]);
      expect(prisma.checklistItems.findMany).not.toHaveBeenCalled();
    });

    it('a platform operator can list any clinic\'s items', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      prisma.checklistItems.findMany.mockResolvedValue([itemB]);
      const result = await service.list('clinic-b', undefined, platformUser);
      expect(result).toHaveLength(1);
    });

    it('with no clinic_id, returns every item across the caller\'s own org only', async () => {
      prisma.checklistItems.findMany.mockResolvedValue([itemA]);
      const result = await service.list(undefined, undefined, orgAUser);
      expect(result).toHaveLength(1);
      expect(prisma.checklistItems.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }),
      }));
    });

    it('with no clinic_id, org B\'s caller is scoped to org B, never org A\'s items', async () => {
      prisma.checklistItems.findMany.mockResolvedValue([itemB]);
      const result = await service.list(undefined, undefined, orgBUser);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-b1');
      expect(prisma.checklistItems.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinic: { client_org_id: 'org-b' } }),
      }));
    });
  });

  describe('create', () => {
    it('creates an item for a clinic in scope', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.checklistItems.create.mockResolvedValue(itemA);
      const result = await service.create({ clinic_id: 'clinic-a', label: 'Consent form' }, orgAUser);
      expect(result.success).toBe(true);
      expect(result.checklistItem?.id).toBe('item-a1');
    });

    it('rejects creating an item for a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.create({ clinic_id: 'clinic-b', label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistItems.create).not.toHaveBeenCalled();
    });

    it('rejects a product_id that does not belong to the given clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', clinic_id: 'clinic-b' });
      const result = await service.create({ clinic_id: 'clinic-a', product_id: 'prod-1', label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistItems.create).not.toHaveBeenCalled();
    });
  });

  describe('update / remove', () => {
    it('rejects updating a cross-org item', async () => {
      prisma.checklistItems.findUnique.mockResolvedValue(itemB);
      const result = await service.update('item-b1', { label: 'x' }, orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistItems.update).not.toHaveBeenCalled();
    });

    it('rejects deleting a cross-org item', async () => {
      prisma.checklistItems.findUnique.mockResolvedValue(itemB);
      const result = await service.remove('item-b1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistItems.update).not.toHaveBeenCalled();
    });
  });

  describe('completeItem', () => {
    it('records completion for an in-scope appointment/item pair', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentA);
      prisma.checklistItems.findUnique.mockResolvedValue(itemA);
      const result = await service.completeItem('item-a1', 'appt-a1', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.checklistCompletions.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ checklist_item_id: 'item-a1', appointment_id: 'appt-a1', completed_by_user_id: 'u1' }),
      }));
    });

    it('rejects completing an item for a cross-org appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentB);
      const result = await service.completeItem('item-a1', 'appt-b1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistCompletions.upsert).not.toHaveBeenCalled();
    });

    it('rejects an item that belongs to a different clinic than the appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentA);
      prisma.checklistItems.findUnique.mockResolvedValue(itemB);
      const result = await service.completeItem('item-b1', 'appt-a1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.checklistCompletions.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getIncompleteRequiredItems', () => {
    it('returns [] when the appointment has no required items', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentA);
      prisma.checklistItems.findMany.mockResolvedValue([]);
      const result = await service.getIncompleteRequiredItems('appt-a1');
      expect(result).toEqual([]);
    });

    it('returns the labels of required items with no completion row', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentA);
      prisma.checklistItems.findMany.mockResolvedValue([itemA, { ...itemA, id: 'item-a2', label: 'Vitals' }]);
      prisma.checklistCompletions.findMany.mockResolvedValue([{ checklist_item_id: 'item-a1' }]);
      const result = await service.getIncompleteRequiredItems('appt-a1');
      expect(result).toEqual(['Vitals']);
    });

    it('returns [] once every required item has a completion row', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointmentA);
      prisma.checklistItems.findMany.mockResolvedValue([itemA]);
      prisma.checklistCompletions.findMany.mockResolvedValue([{ checklist_item_id: 'item-a1' }]);
      const result = await service.getIncompleteRequiredItems('appt-a1');
      expect(result).toEqual([]);
    });

    it('scopes items to product-specific + clinic-wide only, never another product\'s items', async () => {
      prisma.appointments.findUnique.mockResolvedValue({ ...appointmentA, product_id: 'prod-1' });
      prisma.checklistItems.findMany.mockResolvedValue([]);
      await service.getIncompleteRequiredItems('appt-a1');
      expect(prisma.checklistItems.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          clinic_id: 'clinic-a',
          is_required: true,
          OR: [{ product_id: null }, { product_id: 'prod-1' }],
        }),
      }));
    });
  });
});
