import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DrugInput } from './dto/drug.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { isPlatformOperator, orgIdForWrite } from '../common/scoping/tenant-scope';

@Injectable()
export class DrugsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: { client_org_id: string | null; [k: string]: unknown }) {
    const { client_org_id, ...rest } = row;
    return { ...rest, is_platform_seeded: client_org_id === null };
  }

  // REQ044/REQ016 — a hybrid visibility rule orgScope() alone can't express:
  // a tenant sees BOTH the shared platform-seeded rows (client_org_id null)
  // AND their own custom additions, but never another tenant's. A platform
  // operator sees everything, matching every other domain's convention.
  async findAll(user: JwtPayload, search?: string) {
    const where: any = {
      is_deleted: false,
      ...(isPlatformOperator(user) ? {} : { OR: [{ client_org_id: null }, { client_org_id: user.client_org_id }] }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const rows = await this.prisma.drugs.findMany({ where, orderBy: { name: 'asc' } });
    return rows.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.drugs.findUnique({ where: { id } });
    if (!row || row.is_deleted) throw new NotFoundException('Drug not found');
    const visible = isPlatformOperator(user) || row.client_org_id === null || row.client_org_id === user.client_org_id;
    if (!visible) throw new NotFoundException('Drug not found'); // never confirm cross-tenant existence
    return row;
  }

  async create(input: DrugInput, user: JwtPayload) {
    const row = await this.prisma.drugs.create({
      data: { ...input, client_org_id: orgIdForWrite(user, 'drug') },
    });
    return this.toGraphQL(row);
  }

  // Write access is deliberately stricter than read access: seeing a
  // platform-seeded reference row is fine for every tenant, but editing or
  // deleting one is not — only the platform operators who seeded it can.
  // findOne()'s own visibility check is read-oriented and would otherwise
  // let any tenant "successfully" mutate shared reference data.
  private async assertWritable(id: string, user: JwtPayload) {
    const row = await this.findOne(id, user);
    const writable = isPlatformOperator(user) || row.client_org_id === user.client_org_id;
    if (!writable) throw new ForbiddenException('Cannot modify a platform-seeded drug');
    return row;
  }

  async update(id: string, input: DrugInput, user: JwtPayload) {
    const existing = await this.assertWritable(id, user);
    const row = await this.prisma.drugs.update({ where: { id: existing.id }, data: input });
    return this.toGraphQL(row);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.assertWritable(id, user);
    await this.prisma.drugs.update({ where: { id: existing.id }, data: { is_deleted: true } });
    return true;
  }
}
