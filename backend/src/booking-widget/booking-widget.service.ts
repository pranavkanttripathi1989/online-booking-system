import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingWidgetConfigInput } from './dto/booking-widget.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';

// REQ018 (US-BOOK-05) — booking/index.jsx already renders chrome-free for
// an anonymous caller (OptionalAuthShell, BUG011's own fix) and already
// reads a clinician id from its own query params. This module is just the
// allowlist/slug an org admin manages — it does not change the booking
// page itself. The widget snippet an org embeds is a plain iframe pointed
// at /appointments/book?doctor=<id>&widget=<slug>; the resolver's job is
// only to validate a parent origin against allowed_origins when checked
// (checkWidgetOrigin), not to render anything.
function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable()
export class BookingWidgetService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(config: any) {
    if (!config) return null;
    const { client_org_id, is_deleted, allowed_origins, ...rest } = config;
    return { ...rest, allowed_origins: Array.isArray(allowed_origins) ? allowed_origins : [] };
  }

  async findAll(user: JwtPayload) {
    const configs = await this.prisma.bookingWidgetConfig.findMany({
      where: { ...orgScope(user) },
      include: { clinic: true },
      orderBy: { created_at: 'asc' },
    });
    return configs.map((c) => this.toGraphQL(c));
  }

  async findOne(id: string, user: JwtPayload) {
    const config = await this.prisma.bookingWidgetConfig.findUnique({ where: { id }, include: { clinic: true } });
    if (!config) throw new NotFoundException('Widget config not found');
    assertSameOrg(user, config.client_org_id, 'BookingWidgetConfig');
    return this.toGraphQL(config);
  }

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  async create(input: BookingWidgetConfigInput, user: JwtPayload) {
    // BookingWidgetMutationResultType promises a graceful {success,
    // userErrors} shape for every failure, not just orgIdForWrite's own
    // check below — assertClinicInScope throws (matching departments
    // .service.ts's own convention for a plain-entity return type), so it
    // must be caught and translated here rather than left to surface as an
    // unhandled GraphQL error against a type that says it doesn't do that.
    if (input.clinic_id) {
      try {
        await this.assertClinicInScope(input.clinic_id, user);
      } catch (err) {
        const message = err instanceof BadRequestException ? (err.getResponse() as any).message : 'Clinic not found';
        return { success: false, userErrors: [{ message }] };
      }
    }
    const orgId = orgIdForWrite(user, 'BookingWidgetConfig');
    if (!orgId) {
      return { success: false, userErrors: [{ message: 'A platform operator with no organization cannot create a booking widget' }] };
    }
    let slug = input.short_link_slug || randomSlug();
    // short_link_slug is globally unique — retry once on collision rather
    // than surfacing a raw Prisma unique-constraint error to the caller.
    if (await this.prisma.bookingWidgetConfig.findUnique({ where: { short_link_slug: slug } })) {
      slug = randomSlug();
    }
    const config = await this.prisma.bookingWidgetConfig.create({
      data: {
        client_org_id: orgId,
        clinic_id: input.clinic_id,
        allowed_origins: input.allowed_origins,
        short_link_slug: slug,
      },
      include: { clinic: true },
    });
    return { success: true, userErrors: [], config: this.toGraphQL(config) };
  }

  async update(id: string, input: BookingWidgetConfigInput, user: JwtPayload) {
    const existing = await this.prisma.bookingWidgetConfig.findUnique({ where: { id } });
    if (!existing) return { success: false, userErrors: [{ message: 'Widget config not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Widget config not found' }] };
    if (input.clinic_id) {
      try {
        await this.assertClinicInScope(input.clinic_id, user);
      } catch (err) {
        const message = err instanceof BadRequestException ? (err.getResponse() as any).message : 'Clinic not found';
        return { success: false, userErrors: [{ message }] };
      }
    }
    const config = await this.prisma.bookingWidgetConfig.update({
      where: { id },
      data: {
        clinic_id: input.clinic_id ?? existing.clinic_id,
        allowed_origins: input.allowed_origins ?? (existing.allowed_origins as string[]),
      },
      include: { clinic: true },
    });
    return { success: true, userErrors: [], config: this.toGraphQL(config) };
  }

  async deactivate(id: string, user: JwtPayload) {
    const existing = await this.prisma.bookingWidgetConfig.findUnique({ where: { id } });
    if (!existing) return { success: false, userErrors: [{ message: 'Widget config not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Widget config not found' }] };
    const config = await this.prisma.bookingWidgetConfig.update({ where: { id }, data: { is_active: false }, include: { clinic: true } });
    return { success: true, userErrors: [], config: this.toGraphQL(config) };
  }

  // Public-dialect helper — not exposed as its own resolver in this slice
  // (no server-side origin check exists in the frontend embed path yet;
  // browsers already enforce X-Frame-Options/CSP frame-ancestors at the
  // HTTP layer for the underlying page). Kept for a future slice that adds
  // a server-verified embed token, so the allowlist this admin UI collects
  // isn't wasted schema.
  async isOriginAllowed(slug: string, origin: string): Promise<boolean> {
    const config = await this.prisma.bookingWidgetConfig.findUnique({ where: { short_link_slug: slug } });
    if (!config || !config.is_active) return false;
    const origins = Array.isArray(config.allowed_origins) ? (config.allowed_origins as string[]) : [];
    return origins.includes(origin);
  }
}
