import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestBreakGlassAccessInput } from './dto/break-glass.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

const GRACE_MINUTES = 30;

@Injectable()
export class BreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  private toGraphQL(row: any) {
    const now = new Date();
    return {
      id: row.id,
      grantee_user_id: row.grantee_user_id,
      reason: row.reason,
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at ?? undefined,
      is_active: !row.revoked_at && row.expires_at > now,
    };
  }

  // US-SEC-05 — self-requested, immediately granted (no approval gate in
  // this slice's scope, see the requirement doc), org-admin alerted
  // immediately via the real notification pipeline, not a batch report.
  async request(input: RequestBreakGlassAccessInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: "Your account isn't linked to an organization" }] };
    }
    const expiresAt = new Date(Date.now() + GRACE_MINUTES * 60_000);
    const row = await this.prisma.breakGlassGrants.create({
      data: {
        client_org_id: user.client_org_id,
        grantee_user_id: user.sub,
        reason: input.reason,
        expires_at: expiresAt,
      },
    });

    const admins = await this.prisma.userProfiles.findMany({
      where: { client_org_id: user.client_org_id, is_deleted: false, role: { name: { in: ['admin', 'manager'] } } },
    });
    const grantee = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    const granteeName = grantee ? `${grantee.first_name} ${grantee.last_name}` : 'A team member';
    await Promise.all(
      admins.map((admin) =>
        this.notificationTrigger.dispatch(admin.id, 'break_glass_requested', {
          title: 'Break-glass access requested',
          message: `${granteeName} requested emergency access: "${input.reason}"`,
          type: 'alert',
          priority: 'high',
        }),
      ),
    );

    return { success: true, userErrors: [], grant: this.toGraphQL(row) };
  }

  async myGrants(user: JwtPayload) {
    const rows = await this.prisma.breakGlassGrants.findMany({
      where: { grantee_user_id: user.sub },
      orderBy: { granted_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async revoke(id: string, user: JwtPayload) {
    const existing = await this.prisma.breakGlassGrants.findUnique({ where: { id } });
    if (!existing || (user.client_org_id && existing.client_org_id !== user.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Grant not found' }] };
    }
    if (existing.revoked_at) {
      return { success: false, userErrors: [{ message: 'Grant already revoked' }] };
    }
    const row = await this.prisma.breakGlassGrants.update({ where: { id }, data: { revoked_at: new Date() } });
    return { success: true, userErrors: [], grant: this.toGraphQL(row) };
  }

  // Not exposed via GraphQL -- for a future per-domain integration slice
  // (see the requirement doc's own deferred-scope note) to consult before
  // relaxing a self-scoping check.
  async hasActiveGrant(userId: string): Promise<boolean> {
    const active = await this.prisma.breakGlassGrants.findFirst({
      where: { grantee_user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
    });
    return !!active;
  }
}
