import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    products: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    productCategories: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    productSubcategories: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedProduct = {
    id: 'prod-a1',
    clinic_id: 'clinic-a',
    price: 50000, // paise
    is_deleted: false,
    clinic: { id: 'clinic-a', client_org_id: 'org-a' },
    category: null,
    subcategory: null,
  };
  const otherOrgProduct = { ...scopedProduct, id: 'prod-b1', clinic_id: 'clinic-b', clinic: { id: 'clinic-b', client_org_id: 'org-b' } };
  const clinicLessProduct = { ...scopedProduct, id: 'prod-none', clinic_id: null, clinic: null };

  beforeEach(async () => {
    prisma = {
      products: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      productCategories: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      productSubcategories: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProductsService);
  });

  describe('findAll — paise-to-rupees conversion and org scoping via the clinic relation', () => {
    it('converts price from paise to rupees', async () => {
      prisma.products.findMany.mockResolvedValue([scopedProduct]);
      const [result] = await service.findAll(undefined, undefined, orgAUser);
      expect(result.price).toBe(500);
    });

    it('scopes findAll through the clinic relation for an org-linked user', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, orgAUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, platformUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: undefined }) }),
      );
    });
  });

  describe('findOne — tenant isolation when a clinic IS attached', () => {
    it('returns a same-org product', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedProduct);
      const result = await service.findOne('prod-a1', orgAUser);
      expect(result.id).toBe('prod-a1');
    });

    it('rejects a cross-org product with NotFoundException', async () => {
      prisma.products.findUnique.mockResolvedValue(otherOrgProduct);
      await expect(service.findOne('prod-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted product', async () => {
      prisma.products.findUnique.mockResolvedValue({ ...scopedProduct, is_deleted: true });
      await expect(service.findOne('prod-a1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when the product does not exist', async () => {
      prisma.products.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    // Known gap — see context/open-questions.md #2: create() never attaches a
    // clinic_id, so the tenant check (`row.clinic && ...`) is a no-op for any
    // product created through the current UI flow. Documents actual current
    // behavior, not the intended behavior.
    it('KNOWN GAP: does not reject a cross-org read of a clinic-less product (tenant check is skipped when no clinic is attached)', async () => {
      prisma.products.findUnique.mockResolvedValue(clinicLessProduct);
      await expect(service.findOne('prod-none', orgAUser)).resolves.toMatchObject({ id: 'prod-none' });
    });
  });

  describe('create', () => {
    it('generates a SKU from the name when none is supplied', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'Blood Test Panel' } as any);
      const call = prisma.products.create.mock.calls[0][0];
      expect(call.data.sku).toMatch(/^blood-test-panel-/);
    });

    it('uses the supplied SKU when present', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'CUSTOM-SKU' } as any);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sku: 'CUSTOM-SKU' }) }),
      );
    });

    it('converts price from rupees to paise', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'S1', price: 250 } as any);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 25000 }) }),
      );
    });

    it('returns {success:true, product} on success', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      const result = await service.create({ name: 'X', sku: 'S1' } as any);
      expect(result).toEqual({ success: true, userErrors: [], product: { id: 'prod-new' } });
    });

    it('maps a duplicate-SKU Prisma error (P2002) into a friendly userError', async () => {
      prisma.products.create.mockRejectedValue({ code: 'P2002', message: 'raw prisma error' });
      const result = await service.create({ name: 'X', sku: 'DUP' } as any);
      expect(result).toEqual({
        success: false,
        userErrors: [{ message: 'A product with this SKU already exists' }],
      });
    });

    it('falls back to a generic message for a non-P2002 error', async () => {
      prisma.products.create.mockRejectedValue({ message: 'db unavailable' });
      const result = await service.create({ name: 'X', sku: 'S1' } as any);
      expect(result.userErrors).toEqual([{ message: 'db unavailable' }]);
    });
  });

  describe('update — tenant isolation enforced via findOne before any write', () => {
    it('updates a same-org product', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedProduct);
      prisma.products.update.mockResolvedValue({ id: 'prod-a1' });
      const result = await service.update('prod-a1', { name: 'New Name' } as any, orgAUser);
      expect(result).toEqual({ success: true, userErrors: [], product: { id: 'prod-a1' } });
    });

    it('rejects a cross-org update without ever calling prisma.update', async () => {
      prisma.products.findUnique.mockResolvedValue(otherOrgProduct);
      await expect(service.update('prod-b1', { name: 'Hijack' } as any, orgAUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.products.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — tenant isolation enforced via findOne before any write', () => {
    it('soft-deletes a same-org product', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedProduct);
      prisma.products.update.mockResolvedValue({ ...scopedProduct, is_deleted: true });
      const result = await service.remove('prod-a1', orgAUser);
      expect(prisma.products.update).toHaveBeenCalledWith({ where: { id: 'prod-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    it('rejects a cross-org delete without ever calling prisma.update', async () => {
      prisma.products.findUnique.mockResolvedValue(otherOrgProduct);
      await expect(service.remove('prod-b1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.products.update).not.toHaveBeenCalled();
    });
  });

  describe('categories', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.productCategories.findMany.mockResolvedValue([]);
      await service.categories(orgAUser);
      expect(prisma.productCategories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('updateCategory returns {success:false} for a missing category', async () => {
      prisma.productCategories.findUnique.mockResolvedValue(null);
      const result = await service.updateCategory('missing', { name: 'X' } as any);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Category not found' }] });
    });

    it('deleteCategory soft-deletes an existing category', async () => {
      prisma.productCategories.findUnique.mockResolvedValue({ id: 'cat-1', is_deleted: false });
      prisma.productCategories.update.mockResolvedValue({ id: 'cat-1', is_deleted: true });
      const result = await service.deleteCategory('cat-1');
      expect(prisma.productCategories.update).toHaveBeenCalledWith({ where: { id: 'cat-1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });
  });

  describe('subcategories', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.productSubcategories.findMany.mockResolvedValue([]);
      await service.subcategories(orgAUser);
      expect(prisma.productSubcategories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('updateSubcategory returns {success:false} for a missing subcategory', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue(null);
      const result = await service.updateSubcategory('missing', { name: 'X' } as any);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Subcategory not found' }] });
    });

    it('deleteSubcategory soft-deletes an existing subcategory', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue({ id: 'sub-1', is_deleted: false });
      prisma.productSubcategories.update.mockResolvedValue({ id: 'sub-1', is_deleted: true });
      const result = await service.deleteSubcategory('sub-1');
      expect(result).toEqual({ success: true, userErrors: [] });
    });
  });
});
