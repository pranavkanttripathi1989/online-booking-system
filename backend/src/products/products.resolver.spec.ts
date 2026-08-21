import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('ProductsResolver', () => {
  let resolver: ProductsResolver;
  let service: Record<string, jest.Mock>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      categories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      subcategories: jest.fn(),
      createSubcategory: jest.fn(),
      updateSubcategory: jest.fn(),
      deleteSubcategory: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsResolver, { provide: ProductsService, useValue: service }],
    }).compile();
    resolver = module.get(ProductsResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves reads ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, ProductsResolver.prototype.products)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, ProductsResolver.prototype.product)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, ProductsResolver.prototype.productCategories)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, ProductsResolver.prototype.productSubcategories)).toBeUndefined();
    });

    it.each([
      ['createProduct', ProductsResolver.prototype.createProduct],
      ['updateProduct', ProductsResolver.prototype.updateProduct],
      ['deleteProduct', ProductsResolver.prototype.deleteProduct],
      ['createProductCategory', ProductsResolver.prototype.createProductCategory],
      ['updateProductCategory', ProductsResolver.prototype.updateProductCategory],
      ['deleteProductCategory', ProductsResolver.prototype.deleteProductCategory],
      ['createProductSubcategory', ProductsResolver.prototype.createProductSubcategory],
      ['updateProductSubcategory', ProductsResolver.prototype.updateProductSubcategory],
      ['deleteProductSubcategory', ProductsResolver.prototype.deleteProductSubcategory],
    ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
    });
  });

  describe('argument passthrough', () => {
    it('products forwards clinicId, categoryId, and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.products('clinic-a', 'cat-1', user);
      expect(service.findAll).toHaveBeenCalledWith('clinic-a', 'cat-1', user);
    });

    it('createProduct forwards input and user (BUG001 — stamps client_org_id)', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.create.mockResolvedValue({ success: true, userErrors: [] });
      await resolver.createProduct({ name: 'X' } as any, user);
      expect(service.create).toHaveBeenCalledWith({ name: 'X' }, user);
    });

    it('updateProduct forwards id, input, and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.update.mockResolvedValue({ success: true, userErrors: [] });
      await resolver.updateProduct('prod-1', { name: 'X' } as any, user);
      expect(service.update).toHaveBeenCalledWith('prod-1', { name: 'X' }, user);
    });

    it('deleteProduct forwards id and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.remove.mockResolvedValue({ success: true, userErrors: [] });
      await resolver.deleteProduct('prod-1', user);
      expect(service.remove).toHaveBeenCalledWith('prod-1', user);
    });
  });
});
