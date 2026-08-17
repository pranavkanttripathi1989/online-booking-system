import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomInput } from './dto/room.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Rooms carries no client_org_id of its own — scoped indirectly through its
// clinic, the same pattern already documented for Patients (05-patients test-cases.md
// "Key schema fact"). Mirrored here rather than adding a denormalized column,
// since a room can never exist without a clinic (clinic_id is non-nullable).
@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(room: any) {
    if (!room) return null;
    const { room_number, clinic, ...rest } = room;
    return { ...rest, name: room_number, clinic: clinic ?? undefined };
  }

  async findAll(clinicId: string | undefined, user: JwtPayload) {
    const rooms = await this.prisma.rooms.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        clinic: user.client_org_id ? { client_org_id: user.client_org_id } : undefined,
      },
      include: { clinic: true },
      orderBy: { created_at: 'asc' },
    });
    return rooms.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const room = await this.prisma.rooms.findUnique({ where: { id }, include: { clinic: true } });
    if (!room || room.is_deleted) {
      throw new NotFoundException('Room not found');
    }
    if (user.client_org_id && room.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Room not found');
    }
    return this.toGraphQL(room);
  }

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) {
      throw new BadRequestException('Clinic not found');
    }
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) {
      throw new BadRequestException('Clinic not found');
    }
    return clinic;
  }

  async create(input: RoomInput, user: JwtPayload) {
    if (!input.clinic_id) {
      throw new BadRequestException('clinic_id is required');
    }
    await this.assertClinicInScope(input.clinic_id, user);
    const room = await this.prisma.rooms.create({
      data: {
        room_number: input.name,
        capacity: input.capacity,
        clinic_id: input.clinic_id,
        is_active: input.is_active ?? true,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(room);
  }

  async update(id: string, input: RoomInput, user: JwtPayload) {
    const existing = await this.prisma.rooms.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Room not found');
    }
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Room not found');
    }
    if (input.clinic_id && input.clinic_id !== existing.clinic_id) {
      await this.assertClinicInScope(input.clinic_id, user);
    }
    const room = await this.prisma.rooms.update({
      where: { id },
      data: {
        room_number: input.name,
        capacity: input.capacity,
        clinic_id: input.clinic_id ?? existing.clinic_id,
        is_active: input.is_active,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(room);
  }
}
