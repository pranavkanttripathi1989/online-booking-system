import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpacerBlockInput, CreateRoomBlockInput } from './dto/block.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  private toHHMM(d: Date) {
    return d.toISOString().substring(11, 16);
  }

  private toTimeOfDay(hhmm: string) {
    return new Date(`1970-01-01T${hhmm}:00.000Z`);
  }

  private spacerToGraphQL(s: any) {
    return {
      id: s.id,
      clinician_id: s.clinician_id,
      clinic_id: s.clinic_id,
      room_id: s.room_id ?? undefined,
      block_date: s.block_date ?? undefined,
      start_time: this.toHHMM(s.start_time),
      end_time: this.toHHMM(s.end_time),
      reason: s.reason,
      recurrence_type: s.recurrence_type,
      recurrence_days: s.recurrence_days ?? undefined,
      end_date: s.end_date ?? undefined,
      clinician: { id: s.clinician.id, first_name: s.clinician.first_name, last_name: s.clinician.last_name },
      clinic: { id: s.clinic.id, name: s.clinic.name },
      room: s.room ? { id: s.room.id, room_number: s.room.room_number } : undefined,
    };
  }

  private roomBlockToGraphQL(r: any) {
    return {
      id: r.id,
      room_id: r.room_id,
      clinic_id: r.clinic_id,
      block_date: r.block_date,
      start_time: this.toHHMM(r.start_time),
      end_time: this.toHHMM(r.end_time),
      reason: r.reason,
      recurrence_type: r.recurrence_type,
      recurrence_days: r.recurrence_days ?? undefined,
      end_date: r.end_date ?? undefined,
      room: { id: r.room.id, room_number: r.room.room_number },
      clinic: { id: r.clinic.id, name: r.clinic.name },
    };
  }

  async spacerBlocks(limit: number | undefined, user: JwtPayload) {
    const rows = await this.prisma.spacerBlocks.findMany({
      where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
      include: { clinician: true, clinic: true, room: true },
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.spacerToGraphQL(r));
  }

  async roomBlocks(limit: number | undefined, user: JwtPayload) {
    const rows = await this.prisma.roomBlocks.findMany({
      where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
      include: { room: true, clinic: true },
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.roomBlockToGraphQL(r));
  }

  async getSpacerBlocks(clinicianId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const rows = await this.prisma.spacerBlocks.findMany({
      where: { clinician_id: clinicianId, is_deleted: false, block_date: { gte: dayStart, lte: dayEnd } },
    });
    return rows.map((r) => ({
      id: r.id,
      startTime: this.toHHMM(r.start_time),
      endTime: this.toHHMM(r.end_time),
      duration: Math.round((r.end_time.getTime() - r.start_time.getTime()) / 60000),
      reason: r.reason,
    }));
  }

  private mapSpacerData(input: CreateSpacerBlockInput) {
    return {
      clinician_id: input.clinician_id,
      clinic_id: input.clinic_id,
      room_id: input.room_id || null,
      block_date: input.recurrence_type === 'single' && input.block_date ? new Date(input.block_date) : null,
      start_time: this.toTimeOfDay(input.start_time),
      end_time: this.toTimeOfDay(input.end_time),
      reason: input.reason ?? '',
      recurrence_type: input.recurrence_type as any,
      recurrence_days: input.recurrence_days ?? undefined,
      end_date: input.end_date ? new Date(input.end_date) : null,
    };
  }

  // SECURITY: create*Block previously never validated input.clinic_id against
  // the caller's org -- only update*/delete* did (they look up an existing
  // record first). A manager/admin could create a spacer/room block
  // attributed to a DIFFERENT organization's clinic, e.g. to sabotage a
  // competitor's booking availability with bogus "blocked" time. Same gap
  // class fixed in availability.service.ts's create().
  private async assertClinicInOrg(clinicId: string, user: JwtPayload) {
    if (!user.client_org_id) return true;
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    return !!clinic && clinic.client_org_id === user.client_org_id;
  }

  async createSpacerBlock(input: CreateSpacerBlockInput, user: JwtPayload) {
    if (!(await this.assertClinicInOrg(input.clinic_id, user))) {
      return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    }
    try {
      const row = await this.prisma.spacerBlocks.create({
        data: this.mapSpacerData(input),
        include: { clinician: true, clinic: true, room: true },
      });
      return { success: true, userErrors: [], spacerBlock: this.spacerToGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create block' }] };
    }
  }

  async updateSpacerBlock(id: string, input: CreateSpacerBlockInput, user: JwtPayload) {
    const existing = await this.prisma.spacerBlocks.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted || (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Block not found' }] };
    }
    try {
      const row = await this.prisma.spacerBlocks.update({
        where: { id },
        data: this.mapSpacerData(input),
        include: { clinician: true, clinic: true, room: true },
      });
      return { success: true, userErrors: [], spacerBlock: this.spacerToGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update block' }] };
    }
  }

  async deleteSpacerBlock(id: string, user: JwtPayload) {
    const existing = await this.prisma.spacerBlocks.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted || (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Block not found' }] };
    }
    await this.prisma.spacerBlocks.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  private mapRoomBlockData(input: CreateRoomBlockInput) {
    return {
      room_id: input.room_id,
      clinic_id: input.clinic_id,
      block_date: input.block_date ? new Date(input.block_date) : new Date(),
      start_time: this.toTimeOfDay(input.start_time),
      end_time: this.toTimeOfDay(input.end_time),
      reason: input.reason ?? '',
      is_recurring: input.recurrence_type !== 'single',
      recurrence_type: input.recurrence_type as any,
      recurrence_days: input.recurrence_days ?? undefined,
      end_date: input.end_date ? new Date(input.end_date) : null,
    };
  }

  async createRoomBlock(input: CreateRoomBlockInput, user: JwtPayload) {
    if (!(await this.assertClinicInOrg(input.clinic_id, user))) {
      return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    }
    try {
      const row = await this.prisma.roomBlocks.create({
        data: this.mapRoomBlockData(input),
        include: { room: true, clinic: true },
      });
      return { success: true, userErrors: [], roomBlock: this.roomBlockToGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create block' }] };
    }
  }

  async updateRoomBlock(id: string, input: CreateRoomBlockInput, user: JwtPayload) {
    const existing = await this.prisma.roomBlocks.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted || (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Block not found' }] };
    }
    try {
      const row = await this.prisma.roomBlocks.update({
        where: { id },
        data: this.mapRoomBlockData(input),
        include: { room: true, clinic: true },
      });
      return { success: true, userErrors: [], roomBlock: this.roomBlockToGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update block' }] };
    }
  }

  async deleteRoomBlock(id: string, user: JwtPayload) {
    const existing = await this.prisma.roomBlocks.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted || (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Block not found' }] };
    }
    await this.prisma.roomBlocks.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }
}
