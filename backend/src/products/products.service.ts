import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductInput,
  UpdateProductInput,
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
  CreateProductSubcategoryInput,
  UpdateProductSubcategoryInput,
} from './dto/product.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';

const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);
const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(p: any) {
    return {
      ...p,
      price: PAISE_TO_RUPEES(p.price),
      category: p.category ?? undefined,
      subcategory: p.subcategory ?? undefined,
    };
  }

  private include() {
    return { category: true, subcategory: true };
  }

  private generateSku(name: string) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return `${slug || 'prod'}-${Date.now().toString(36)}`;
  }

  async findAll(clinicId: string | undefined, categoryId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.products.findMany({
      where: {
        is_deleted: false,
        clinic_id: clinicId ?? undefined,
        category_id: categoryId ?? undefined,
        ...orgScope(user),
      },
      include: this.include(),
      orderBy: { order_by: 'asc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.products.findUnique({ where: { id }, include: this.include() });
    if (!row || row.is_deleted) throw new NotFoundException('Product not found');
    assertSameOrg(user, row.client_org_id, 'Product');
    return this.toGraphQL(row);
  }

  async create(input: CreateProductInput, user: JwtPayload) {
    try {
      const row = await this.prisma.products.create({
        data: {
          name: input.name,
          sku: input.sku || this.generateSku(input.name),
          description: input.description ?? '',
          price: RUPEES_TO_PAISE(input.price),
          stock_quantity: input.stock_quantity ?? 0,
          category_id: input.category_id || undefined,
          subcategory_id: input.subcategory_id || undefined,
          product_type: (input.product_type ?? 'simple') as any,
          is_active: input.is_active ?? true,
          // BUG006 — `?? undefined` silently created an ORG-LESS product, which
          // before orgScope() landed was then visible to every tenant.
          client_org_id: orgIdForWrite(user, 'product'),
        },
      });
      return { success: true, userErrors: [], product: { id: row.id } };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.code === 'P2002' ? 'A product with this SKU already exists' : e.message ?? 'Failed to create product' }] };
    }
  }

  async update(id: string, input: UpdateProductInput, user: JwtPayload) {
    await this.findOne(id, user); // enforces tenant scoping before any write
    try {
      const row = await this.prisma.products.update({
        where: { id },
        data: {
          name: input.name,
          sku: input.sku || undefined,
          description: input.description,
          price: RUPEES_TO_PAISE(input.price),
          stock_quantity: input.stock_quantity,
          category_id: input.category_id || undefined,
          subcategory_id: input.subcategory_id || undefined,
          product_type: input.product_type ? (input.product_type as any) : undefined,
          is_active: input.is_active,
        },
      });
      return { success: true, userErrors: [], product: { id: row.id } };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update product' }] };
    }
  }

  async remove(id: string, user: JwtPayload) {
    await this.findOne(id, user);
    await this.prisma.products.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // ── Categories ─────────────────────────────────────────────────────────

  async categories(user: JwtPayload) {
    const rows = await this.prisma.productCategories.findMany({
      where: { is_deleted: false, ...orgScope(user) },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  // BUG001 — update/delete previously had NO tenant check at all (not even a
  // null-guarded one): any manager/admin could rename or delete any org's
  // category by id. Mirrors findOne's not-found-not-forbidden pattern so a
  // cross-org id doesn't reveal whether the row exists.
  private async findCategoryScoped(id: string, user: JwtPayload) {
    const existing = await this.prisma.productCategories.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return null;
    if (!isSameOrg(user, existing.client_org_id)) return null;
    return existing;
  }

  async createCategory(input: CreateProductCategoryInput, user: JwtPayload) {
    try {
      await this.prisma.productCategories.create({
        // BUG006 — see createProduct; `?? undefined` created an org-less row.
        data: { name: input.name, description: input.description ?? '', client_org_id: orgIdForWrite(user, 'category') },
      });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create category' }] };
    }
  }

  async updateCategory(id: string, input: UpdateProductCategoryInput, user: JwtPayload) {
    if (!(await this.findCategoryScoped(id, user))) return { success: false, userErrors: [{ message: 'Category not found' }] };
    await this.prisma.productCategories.update({ where: { id }, data: { name: input.name, description: input.description } });
    return { success: true, userErrors: [] };
  }

  async deleteCategory(id: string, user: JwtPayload) {
    if (!(await this.findCategoryScoped(id, user))) return { success: false, userErrors: [{ message: 'Category not found' }] };
    await this.prisma.productCategories.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // ── Subcategories ──────────────────────────────────────────────────────

  async subcategories(user: JwtPayload) {
    const rows = await this.prisma.productSubcategories.findMany({
      where: { is_deleted: false, ...orgScope(user) },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  // BUG001 — same previously-zero-check gap as findCategoryScoped, for subcategories.
  private async findSubcategoryScoped(id: string, user: JwtPayload) {
    const existing = await this.prisma.productSubcategories.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return null;
    if (!isSameOrg(user, existing.client_org_id)) return null;
    return existing;
  }

  async createSubcategory(input: CreateProductSubcategoryInput, user: JwtPayload) {
    try {
      await this.prisma.productSubcategories.create({
        data: {
          category_id: input.category_id,
          name: input.name,
          description: input.description ?? '',
          // BUG006 — see createProduct; `?? undefined` created an org-less row.
          client_org_id: orgIdForWrite(user, 'subcategory'),
        },
      });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create subcategory' }] };
    }
  }

  async updateSubcategory(id: string, input: UpdateProductSubcategoryInput, user: JwtPayload) {
    if (!(await this.findSubcategoryScoped(id, user))) return { success: false, userErrors: [{ message: 'Subcategory not found' }] };
    await this.prisma.productSubcategories.update({
      where: { id },
      data: { category_id: input.category_id, name: input.name, description: input.description },
    });
    return { success: true, userErrors: [] };
  }

  async deleteSubcategory(id: string, user: JwtPayload) {
    if (!(await this.findSubcategoryScoped(id, user))) return { success: false, userErrors: [{ message: 'Subcategory not found' }] };
    await this.prisma.productSubcategories.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }
}
