import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { CreateOperationTheatreInput, UpdateOperationTheatreInput } from './dto/operation-theatre.input';

// REQ179 (IPD slice 3) — theatre master data. Own client_org_id (the
// Wards/Departments precedent, not the via-clinic one) since a theatre
// list/board is an org+clinic-wide query.
@Injectable()
export class OperationTheatresService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  private toGraphQL(t: any) {
    return {
      id: t.id,
      clinic_id: t.clinic_id,
      name: t.name,
      default_turnaround_minutes: t.default_turnaround_minutes,
      is_active: t.is_active,
      created_at: t.created_at,
    };
  }

  async findAll(clinicId: string | undefined, user: JwtPayload) {
    const theatres = await this.prisma.operationTheatres.findMany({
      where: { is_deleted: false, ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      orderBy: { name: 'asc' },
    });
    return theatres.map((t) => this.toGraphQL(t));
  }

  async findOne(id: string, user: JwtPayload) {
    const theatre = await this.prisma.operationTheatres.findUnique({ where: { id } });
    if (!theatre || theatre.is_deleted) throw new NotFoundException('Operation theatre not found');
    assertSameOrg(user, theatre.client_org_id, 'Operation theatre');
    return this.toGraphQL(theatre);
  }

  async assertTheatreInScope(theatreId: string, user: JwtPayload) {
    const theatre = await this.prisma.operationTheatres.findUnique({ where: { id: theatreId } });
    if (!theatre || theatre.is_deleted) throw new BadRequestException('Operation theatre not found');
    if (!isSameOrg(user, theatre.client_org_id)) throw new BadRequestException('Operation theatre not found');
    if (!theatre.is_active) throw new BadRequestException(`Theatre ${theatre.name} is not in service`);
    return theatre;
  }

  async create(input: CreateOperationTheatreInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const theatre = await this.prisma.operationTheatres.create({
      data: {
        client_org_id: clinic.client_org_id as string,
        clinic_id: clinic.id,
        name: input.name,
        default_turnaround_minutes: input.default_turnaround_minutes ?? 30,
      },
    });
    return this.toGraphQL(theatre);
  }

  async update(id: string, input: UpdateOperationTheatreInput, user: JwtPayload) {
    const existing = await this.prisma.operationTheatres.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Operation theatre not found');
    assertSameOrg(user, existing.client_org_id, 'Operation theatre');

    const theatre = await this.prisma.operationTheatres.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        default_turnaround_minutes: input.default_turnaround_minutes ?? existing.default_turnaround_minutes,
        is_active: input.is_active ?? existing.is_active,
      },
    });
    return this.toGraphQL(theatre);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.operationTheatres.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return { success: false, userErrors: [{ message: 'Operation theatre not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Operation theatre not found' }] };

    const liveBooking = await this.prisma.otBookings.findFirst({
      where: { theatre_id: id, is_cancelled: false, status: { in: ['scheduled', 'in_progress'] } },
    });
    if (liveBooking) {
      return { success: false, userErrors: [{ message: 'This theatre still has scheduled or in-progress bookings. Cancel or complete them first.' }] };
    }
    await this.prisma.operationTheatres.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }
}
