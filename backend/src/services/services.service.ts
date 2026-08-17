import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceInput } from './dto/service.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(product: any) {
    const { price, clinicianServices, category, ...rest } = product;
    return {
      ...rest,
      price: PAISE_TO_RUPEES(price),
      category: category ?? undefined,
      clinicians: (clinicianServices ?? []).map((cs: any) => cs.clinician),
    };
  }

  private include() {
    return {
      category: true,
      clinicianServices: { where: { is_deleted: false }, include: { clinician: true } },
    };
  }

  async findAll(clinicId: string | undefined, isActive: boolean | undefined, user: JwtPayload) {
    const products = await this.prisma.products.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
        clinic: user.client_org_id ? { client_org_id: user.client_org_id } : undefined,
      },
      include: this.include(),
      orderBy: { order_by: 'asc' },
    });
    return products.map((p) => this.toGraphQL(p));
  }

  async findOne(id: string, user: JwtPayload) {
    const product = await this.prisma.products.findUnique({ where: { id }, include: { ...this.include(), clinic: true } });
    if (!product || product.is_deleted) {
      throw new NotFoundException('Service not found');
    }
    if (user.client_org_id && product.clinic && product.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Service not found');
    }
    return this.toGraphQL(product);
  }

  // Products.sku is @unique and non-nullable, but ServiceInput (the canonical,
  // simpler contract this increment builds) never collects one — auto-generate
  // a readable, collision-safe one rather than blocking the simpler form.
  private generateSku(name: string) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return `${slug || 'svc'}-${Date.now().toString(36)}`;
  }

  async create(input: ServiceInput) {
    const product = await this.prisma.products.create({
      data: {
        name: input.name,
        description: input.description ?? '',
        duration_minutes: input.duration_minutes,
        price: RUPEES_TO_PAISE(input.price),
        is_active: input.is_active ?? true,
        product_type: 'simple',
        sku: this.generateSku(input.name),
      },
      include: this.include(),
    });
    return this.toGraphQL(product);
  }

  async update(id: string, input: ServiceInput, user: JwtPayload) {
    await this.findOne(id, user); // enforces tenant scoping before any write
    const product = await this.prisma.products.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        duration_minutes: input.duration_minutes,
        price: RUPEES_TO_PAISE(input.price),
        is_active: input.is_active,
      },
      include: this.include(),
    });
    return this.toGraphQL(product);
  }
}
