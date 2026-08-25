import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isPlatformOperator } from '../common/scoping/tenant-scope';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.notifications.findMany({
      where: {
        user_id: user.sub,
        is_deleted: false,
        is_read: filter === 'unread' ? false : undefined,
      },
      orderBy: { created_at: 'desc' },
    });
    return rows;
  }

  async markRead(id: string, user: JwtPayload) {
    await this.prisma.notifications.updateMany({ where: { id, user_id: user.sub }, data: { is_read: true } });
    return { success: true };
  }

  async markAllRead(user: JwtPayload) {
    await this.prisma.notifications.updateMany({ where: { user_id: user.sub, is_read: false }, data: { is_read: true } });
    return { success: true };
  }

  async remove(id: string, user: JwtPayload) {
    await this.prisma.notifications.updateMany({ where: { id, user_id: user.sub }, data: { is_deleted: true } });
    return { success: true };
  }

  // Called from other resolvers (e.g. AppointmentsService's cancel/complete
  // transitions) to create system-generated notifications — there is no
  // client-facing createNotification mutation, matching the fact the
  // frontend never attempts to create one itself (next-10-features-
  // implementation-plan.md #8).
  async create(userId: string, title: string, message: string, type: string, priority: string = 'medium') {
    return this.prisma.notifications.create({
      data: { user_id: userId, title, message, type: type as any, priority: priority as any },
    });
  }

  // REQ025 (US-NOT-05) — org-scoped delivery analytics from
  // NotificationSendLog, which now records every attempted external send,
  // not just successful ones (notification-trigger.service.ts's own
  // logSendAttempt()). A caller with no org (admin/super_admin) sees every
  // org's rows, matching this schema's own "org-less caller sees
  // everything" convention for platform operators.
  async deliveryAnalytics(user: JwtPayload) {
    const rows = await this.prisma.notificationSendLog.groupBy({
      by: ['event_type', 'channel', 'status'],
      where: isPlatformOperator(user) ? {} : orgScope(user),
      _count: { _all: true },
    });
    return rows.map((r) => ({ event_type: r.event_type, channel: r.channel, status: r.status, count: r._count._all }));
  }
}
