import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomInput } from './dto/room.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';

// Rooms carries no client_org_id of its own — scoped indirectly through its
// clinic, the same pattern already documented for Patients (05-patients test-cases.md
// "Key schema fact"). Mirrored here rather than adding a denormalized column,
// since a room can never exist without a clinic (clinic_id is non-nullable).
@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTypeNames(roomType?: string | null, clinicianType?: string | null) {
    const [roomTypeRow, clinicianTypeRow] = await Promise.all([
      roomType ? this.prisma.roomTypeModel.findUnique({ where: { id: roomType } }) : null,
      clinicianType ? this.prisma.clinicianTypeModel.findUnique({ where: { id: clinicianType } }) : null,
    ]);
    return { roomTypeName: roomTypeRow?.name, clinicianTypeName: clinicianTypeRow?.name };
  }

  private async toGraphQL(room: any) {
    if (!room) return null;
    const { room_number, room_type, clinician_type, clinic, ...rest } = room;
    const { roomTypeName, clinicianTypeName } = await this.resolveTypeNames(room_type, clinician_type);
    return {
      ...rest,
      name: room_number,
      room_number,
      room_type: room_type ?? undefined,
      roomTypeName,
      clinician_type: clinician_type ?? undefined,
      clinicianTypeName,
      clinic: clinic ?? undefined,
    };
  }

  async findAll(clinicId: string | undefined, user: JwtPayload) {
    const rooms = await this.prisma.rooms.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...orgScopeVia(user, 'clinic'),
      },
      include: { clinic: true },
      orderBy: { created_at: 'asc' },
    });
    return Promise.all(rooms.map((r) => this.toGraphQL(r)));
  }

  // manager/rooms/index.jsx's real contract (context/frontend-integration-audit.md
  // #20) — same underlying table/scoping as findAll, paginated + free-text search
  // over room_number, a distinct query name (`roomsPaginated`) so it does not
  // collide with the canonical bare-array `rooms` query used elsewhere.
  async findAllPaginated(search: string | undefined, limit: number | undefined, offset: number | undefined, user: JwtPayload) {
    const take = limit ?? 20;
    const skip = offset ?? 0;
    const where = {
      is_deleted: false,
      ...orgScopeVia(user, 'clinic'),
      ...(search ? { room_number: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.rooms.count({ where }),
      this.prisma.rooms.findMany({ where, include: { clinic: true }, orderBy: { created_at: 'asc' }, take, skip }),
    ]);
    return {
      data: await Promise.all(rows.map((r) => this.toGraphQL(r))),
      pageInfo: {
        total,
        limit: take,
        offset: skip,
        hasNextPage: skip + rows.length < total,
        hasPreviousPage: skip > 0,
      },
    };
  }

  async findOne(id: string, user: JwtPayload) {
    const room = await this.prisma.rooms.findUnique({ where: { id }, include: { clinic: true } });
    if (!room || room.is_deleted) {
      throw new NotFoundException('Room not found');
    }
    assertSameOrg(user, room.clinic.client_org_id, 'Room');
    return this.toGraphQL(room);
  }

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) {
      throw new BadRequestException('Clinic not found');
    }
    if (!isSameOrg(user, clinic.client_org_id)) {
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
        room_type: input.room_type ?? undefined,
        clinician_type: input.clinician_type ?? undefined,
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
    assertSameOrg(user, existing.clinic.client_org_id, 'Room');
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
        room_type: input.room_type ?? existing.room_type,
        clinician_type: input.clinician_type ?? existing.clinician_type,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(room);
  }

  // manager/rooms/index.jsx's real contract — no delete operation existed
  // anywhere in the rooms domain before (context/frontend-integration-audit.md #20).
  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.rooms.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Room not found' }] };
    }
    if (!isSameOrg(user, existing.clinic.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Room not found' }] };
    }
    await this.prisma.rooms.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }
}
