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
  // F-01: org-less but NOT a platform role — the self-registered-account shape.
  const selfRegisteredPatient: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedProduct = {
    id: 'prod-a1',
    clinic_id: null,
    client_org_id: 'org-a',
    price: 50000, // paise
    is_deleted: false,
    category: null,
    subcategory: null,
  };
  const otherOrgProduct = { ...scopedProduct, id: 'prod-b1', client_org_id: 'org-b' };
  const orgLessProduct = { ...scopedProduct, id: 'prod-none', client_org_id: null };

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

  describe('findAll — paise-to-rupees conversion and org scoping via client_org_id', () => {
    it('converts price from paise to rupees', async () => {
      prisma.products.findMany.mockResolvedValue([scopedProduct]);
      const [result] = await service.findAll(undefined, undefined, orgAUser);
      expect(result.price).toBe(500);
    });

    it('scopes findAll by client_org_id for an org-linked user', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, orgAUser);
      expect(prisma.products.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, platformUser);
      const where = prisma.products.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeUndefined();
    });

    // F-01 regression test: before the fix, `client_org_id: user.client_org_id
    // ?? undefined` was Prisma's "ignore this filter" shape for an org-less
    // caller too, not just for a platform operator — a self-registered
    // account saw every tenant's product catalogue with prices.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.products.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, selfRegisteredPatient);
      const where = prisma.products.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
    });
  });

  describe('findOne — tenant isolation via client_org_id (BUG001)', () => {
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

    // BUG001 — previously this was a documented KNOWN GAP: a clinic-less
    // product's tenant check silently skipped because it keyed off the
    // (also always-null) clinic relation. Now that org-scoping is a direct
    // column stamped at create time, an org-less row is correctly rejected
    // for a tenant caller, same as any other org's row.
    it('rejects a cross-org read of an org-less product for a tenant caller (BUG001 fixed)', async () => {
      prisma.products.findUnique.mockResolvedValue(orgLessProduct);
      await expect(service.findOne('prod-none', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('a platform-wide caller can still read an org-less product', async () => {
      prisma.products.findUnique.mockResolvedValue(orgLessProduct);
      await expect(service.findOne('prod-none', platformUser)).resolves.toMatchObject({ id: 'prod-none' });
    });

    // F-01 regression test, single-record path: an org-less non-operator
    // must never match anything, including another org-less (legacy) record.
    it('rejects an org-less non-operator reading ANY product, even an org-less one (F-01)', async () => {
      prisma.products.findUnique.mockResolvedValue(scopedProduct);
      await expect(service.findOne('prod-a1', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
      prisma.products.findUnique.mockResolvedValue(orgLessProduct);
      await expect(service.findOne('prod-none', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('generates a SKU from the name when none is supplied', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'Blood Test Panel' } as any, orgAUser);
      const call = prisma.products.create.mock.calls[0][0];
      expect(call.data.sku).toMatch(/^blood-test-panel-/);
    });

    it('uses the supplied SKU when present', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'CUSTOM-SKU' } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sku: 'CUSTOM-SKU' }) }),
      );
    });

    it('converts price from rupees to paise', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'S1', price: 250 } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ price: 25000 }) }),
      );
    });

    // BUG001 — the actual fix: create() never stamped any org scope before,
    // which is why every product ever created was invisible to its own org.
    it('stamps client_org_id from the caller JWT, never from client input', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'S1' } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('stamps undefined client_org_id for a platform-wide caller (visible only to platform roles)', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'S1' } as any, platformUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: undefined }) }),
      );
    });

    it('returns {success:true, product} on success', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      const result = await service.create({ name: 'X', sku: 'S1' } as any, orgAUser);
      expect(result).toEqual({ success: true, userErrors: [], product: { id: 'prod-new' } });
    });

    it('maps a duplicate-SKU Prisma error (P2002) into a friendly userError', async () => {
      prisma.products.create.mockRejectedValue({ code: 'P2002', message: 'raw prisma error' });
      const result = await service.create({ name: 'X', sku: 'DUP' } as any, orgAUser);
      expect(result).toEqual({
        success: false,
        userErrors: [{ message: 'A product with this SKU already exists' }],
      });
    });

    it('falls back to a generic message for a non-P2002 error', async () => {
      prisma.products.create.mockRejectedValue({ message: 'db unavailable' });
      const result = await service.create({ name: 'X', sku: 'S1' } as any, orgAUser);
      expect(result.userErrors).toEqual([{ message: 'db unavailable' }]);
    });

    // REQ046 (US-CAT-06) — a retail/pharmacy item created through the
    // Products path is taxable by default, unlike a clinical service
    // created through ServicesService (see services.service.spec.ts).
    it('defaults is_tax_exempt to false when not supplied', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'Paracetamol 500mg', sku: 'S1' } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_tax_exempt: false }) }),
      );
    });

    it('honours an explicit is_tax_exempt: true override', async () => {
      prisma.products.create.mockResolvedValue({ id: 'prod-new' });
      await service.create({ name: 'X', sku: 'S1', is_tax_exempt: true, hsn: '9993' } as any, orgAUser);
      expect(prisma.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_tax_exempt: true, hsn: '9993' }) }),
      );
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
    it('scopes to the caller org via client_org_id', async () => {
      prisma.productCategories.findMany.mockResolvedValue([]);
      await service.categories(orgAUser);
      expect(prisma.productCategories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('createCategory stamps client_org_id from the JWT', async () => {
      prisma.productCategories.create.mockResolvedValue({ id: 'cat-new' });
      await service.createCategory({ name: 'Diagnostics' } as any, orgAUser);
      expect(prisma.productCategories.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    // F-01 regression test.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.productCategories.findMany.mockResolvedValue([]);
      await service.categories(selfRegisteredPatient);
      const where = prisma.productCategories.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
    });

    it('rejects an org-less non-operator updating/deleting ANY category (F-01)', async () => {
      prisma.productCategories.findUnique.mockResolvedValue({ id: 'cat-1', is_deleted: false, client_org_id: 'org-a' });
      const result = await service.updateCategory('cat-1', { name: 'Hijack' } as any, selfRegisteredPatient);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Category not found' }] });
      expect(prisma.productCategories.update).not.toHaveBeenCalled();
    });

    it('updateCategory returns {success:false} for a missing category', async () => {
      prisma.productCategories.findUnique.mockResolvedValue(null);
      const result = await service.updateCategory('missing', { name: 'X' } as any, orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Category not found' }] });
    });

    // BUG001 — previously there was NO tenant check at all on this path (not
    // even a null-guarded one): any manager could rename any org's category.
    it('rejects a cross-org update as "not found" without ever calling prisma.update (BUG001 fixed)', async () => {
      prisma.productCategories.findUnique.mockResolvedValue({ id: 'cat-b1', is_deleted: false, client_org_id: 'org-b' });
      const result = await service.updateCategory('cat-b1', { name: 'Hijack' } as any, orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Category not found' }] });
      expect(prisma.productCategories.update).not.toHaveBeenCalled();
    });

    it('deleteCategory soft-deletes an existing same-org category', async () => {
      prisma.productCategories.findUnique.mockResolvedValue({ id: 'cat-1', is_deleted: false, client_org_id: 'org-a' });
      prisma.productCategories.update.mockResolvedValue({ id: 'cat-1', is_deleted: true });
      const result = await service.deleteCategory('cat-1', orgAUser);
      expect(prisma.productCategories.update).toHaveBeenCalledWith({ where: { id: 'cat-1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    // BUG001 — same previously-zero-check gap as update, for delete.
    it('rejects a cross-org delete as "not found" without ever calling prisma.update (BUG001 fixed)', async () => {
      prisma.productCategories.findUnique.mockResolvedValue({ id: 'cat-b1', is_deleted: false, client_org_id: 'org-b' });
      const result = await service.deleteCategory('cat-b1', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Category not found' }] });
      expect(prisma.productCategories.update).not.toHaveBeenCalled();
    });
  });

  describe('subcategories', () => {
    it('scopes to the caller org via client_org_id', async () => {
      prisma.productSubcategories.findMany.mockResolvedValue([]);
      await service.subcategories(orgAUser);
      expect(prisma.productSubcategories.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('createSubcategory stamps client_org_id from the JWT', async () => {
      prisma.productSubcategories.create.mockResolvedValue({ id: 'sub-new' });
      await service.createSubcategory({ category_id: 'cat-1', name: 'Blood Tests' } as any, orgAUser);
      expect(prisma.productSubcategories.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    // F-01 regression test.
    it('does NOT fall through to seeing every org for an org-less non-operator (F-01)', async () => {
      prisma.productSubcategories.findMany.mockResolvedValue([]);
      await service.subcategories(selfRegisteredPatient);
      const where = prisma.productSubcategories.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeTruthy();
      expect(where.client_org_id).not.toBe('org-a');
    });

    it('updateSubcategory returns {success:false} for a missing subcategory', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue(null);
      const result = await service.updateSubcategory('missing', { name: 'X' } as any, orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Subcategory not found' }] });
    });

    // BUG001 — same previously-zero-check gap as categories, for subcategories.
    it('rejects a cross-org update as "not found" without ever calling prisma.update (BUG001 fixed)', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue({ id: 'sub-b1', is_deleted: false, client_org_id: 'org-b' });
      const result = await service.updateSubcategory('sub-b1', { name: 'Hijack' } as any, orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Subcategory not found' }] });
      expect(prisma.productSubcategories.update).not.toHaveBeenCalled();
    });

    it('deleteSubcategory soft-deletes an existing same-org subcategory', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue({ id: 'sub-1', is_deleted: false, client_org_id: 'org-a' });
      prisma.productSubcategories.update.mockResolvedValue({ id: 'sub-1', is_deleted: true });
      const result = await service.deleteSubcategory('sub-1', orgAUser);
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    it('rejects a cross-org delete as "not found" without ever calling prisma.update (BUG001 fixed)', async () => {
      prisma.productSubcategories.findUnique.mockResolvedValue({ id: 'sub-b1', is_deleted: false, client_org_id: 'org-b' });
      const result = await service.deleteSubcategory('sub-b1', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Subcategory not found' }] });
      expect(prisma.productSubcategories.update).not.toHaveBeenCalled();
    });
  });
});
