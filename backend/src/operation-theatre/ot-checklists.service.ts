import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg } from '../common/scoping/tenant-scope';
import { CompleteOtChecklistInput } from './dto/operation-theatre.input';

// REQ179 (IPD slice 3) — the WHO Surgical Safety Checklist, exactly 3
// phases (sign_in | time_out | sign_out). @@unique([booking_id, phase])
// makes completing an already-completed phase a clean application-level
// conflict rather than a silent duplicate row.
@Injectable()
export class OtChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(input: CompleteOtChecklistInput, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id: input.booking_id } });
    if (!booking) throw new NotFoundException('OT booking not found');
    assertSameOrg(user, booking.client_org_id, 'OT booking');

    const existing = await this.prisma.otChecklists.findUnique({
      where: { booking_id_phase: { booking_id: input.booking_id, phase: input.phase } },
    });
    if (existing?.completed_at) {
      throw new BadRequestException(`The ${input.phase.replace(/_/g, ' ')} phase has already been completed`);
    }

    await this.prisma.otChecklists.upsert({
      where: { booking_id_phase: { booking_id: input.booking_id, phase: input.phase } },
      create: {
        booking_id: input.booking_id,
        phase: input.phase,
        items_json: input.items as any,
        completed_by_user_id: user.sub,
        completed_at: new Date(),
      },
      update: {
        items_json: input.items as any,
        completed_by_user_id: user.sub,
        completed_at: new Date(),
      },
    });
    return booking.id;
  }
}
