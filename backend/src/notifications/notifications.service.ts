import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isPlatformOperator } from '../common/scoping/tenant-scope';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // REQ134 (F-14 residue) — {data, paginatorInfo}, matching
  // test-results.service.ts#findAll's own $transaction([count, findMany])
  // pagination math (REQ133).
  async findAll(filter: string | undefined, first: number, page: number, user: JwtPayload) {
    const where = {
      user_id: user.sub,
      is_deleted: false,
      is_read: filter === 'unread' ? false : undefined,
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * first,
        take: first,
      }),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / first));
    const firstItem = total === 0 ? 0 : (page - 1) * first + 1;
    return {
      data: rows,
      paginatorInfo: {
        count: rows.length,
        currentPage: page,
        firstItem,
        hasMorePages: page < lastPage,
        lastItem: firstItem + rows.length - 1,
        lastPage,
        perPage: first,
        total,
      },
    };
  }

  // REQ134 — a real DB count(), decoupled from findAll()'s own bounded
  // page fetch. NotificationBell.jsx's badge needs the true total unread
  // count regardless of how many rows its own dropdown list actually
  // fetches; counting client-side from a now-bounded list would silently
  // undercount once a caller has more unread notifications than the
  // list's own page size.
  async unreadCount(user: JwtPayload) {
    return this.prisma.notifications.count({
      where: { user_id: user.sub, is_deleted: false, is_read: false },
    });
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
