import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg } from '../common/scoping/tenant-scope';
import { CreateOtNoteInput, UpdateOtNoteInput, SignOtNoteInput } from './dto/operation-theatre.input';

// REQ179 (IPD slice 3) — the operative note. One per booking (booking_id
// is @unique), locked via the same reject_write_if_locked() trigger
// AdmissionNotes/DischargeSummaries already use (REQ179 slice 2) rather
// than a fresh trigger definition.
@Injectable()
export class OtNotesService {
  constructor(private readonly prisma: PrismaService) {}

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  private toGraphQL(n: any) {
    return {
      id: n.id,
      booking_id: n.booking_id,
      pre_op_diagnosis: n.pre_op_diagnosis,
      procedure_performed: n.procedure_performed,
      findings: n.findings,
      complications: n.complications,
      post_op_diagnosis: n.post_op_diagnosis,
      post_op_instructions: n.post_op_instructions,
      author_name: n.author ? this.fullName(n.author) : undefined,
      signed_at: n.signed_at ?? undefined,
      locked: n.locked,
    };
  }

  private readonly INCLUDE = { author: true };

  private async assertBookingInScope(bookingId: string, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('OT booking not found');
    assertSameOrg(user, booking.client_org_id, 'OT booking');
    return booking;
  }

  async findByBooking(bookingId: string, user: JwtPayload) {
    await this.assertBookingInScope(bookingId, user);
    const note = await this.prisma.otNotes.findUnique({ where: { booking_id: bookingId }, include: this.INCLUDE });
    return note ? this.toGraphQL(note) : null;
  }

  async create(input: CreateOtNoteInput, user: JwtPayload) {
    const booking = await this.assertBookingInScope(input.booking_id, user);
    const existing = await this.prisma.otNotes.findUnique({ where: { booking_id: input.booking_id } });
    if (existing) throw new BadRequestException('An operative note already exists for this booking');
    if (!user.clinician_id) throw new BadRequestException('Only a clinician can write the operative note');

    const note = await this.prisma.otNotes.create({
      data: {
        client_org_id: booking.client_org_id,
        booking_id: input.booking_id,
        pre_op_diagnosis: input.pre_op_diagnosis ?? '',
        procedure_performed: input.procedure_performed ?? '',
        findings: input.findings ?? '',
        complications: input.complications ?? '',
        post_op_diagnosis: input.post_op_diagnosis ?? '',
        post_op_instructions: input.post_op_instructions ?? '',
        author_clinician_id: user.clinician_id,
      },
      include: this.INCLUDE,
    });
    return this.toGraphQL(note);
  }

  async update(bookingId: string, input: UpdateOtNoteInput, user: JwtPayload) {
    const existing = await this.prisma.otNotes.findUnique({ where: { booking_id: bookingId } });
    if (!existing) throw new NotFoundException('Operative note not found');
    assertSameOrg(user, existing.client_org_id, 'Operative note');
    if (existing.locked) throw new BadRequestException('This operative note has been signed and can no longer be edited');

    const note = await this.prisma.otNotes.update({
      where: { booking_id: bookingId },
      data: {
        pre_op_diagnosis: input.pre_op_diagnosis ?? existing.pre_op_diagnosis,
        procedure_performed: input.procedure_performed ?? existing.procedure_performed,
        findings: input.findings ?? existing.findings,
        complications: input.complications ?? existing.complications,
        post_op_diagnosis: input.post_op_diagnosis ?? existing.post_op_diagnosis,
        post_op_instructions: input.post_op_instructions ?? existing.post_op_instructions,
      },
      include: this.INCLUDE,
    });
    return this.toGraphQL(note);
  }

  async sign(input: SignOtNoteInput, user: JwtPayload) {
    const existing = await this.prisma.otNotes.findUnique({ where: { booking_id: input.booking_id } });
    if (!existing) throw new NotFoundException('Operative note not found');
    assertSameOrg(user, existing.client_org_id, 'Operative note');
    if (existing.locked) throw new BadRequestException('This operative note has already been signed');
    if (!user.clinician_id) throw new BadRequestException('Only a clinician can sign the operative note');

    const note = await this.prisma.otNotes.update({
      where: { booking_id: input.booking_id },
      data: { locked: true, signed_at: new Date() },
      include: this.INCLUDE,
    });
    return this.toGraphQL(note);
  }
}
