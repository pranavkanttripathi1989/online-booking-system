import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadInput } from './dto/message.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PUB_SUB } from '../common/pubsub.provider';
import { orgScope } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

export const MESSAGE_RECEIVED_EVENT = 'messageReceived';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  private async participantsFor(threadId: string) {
    const rows = await this.prisma.messageParticipants.findMany({
      where: { thread_id: threadId },
      include: { user: { include: { userProfiles: { include: { role: true } } } } },
    });
    return rows
      .filter((r) => r.user.userProfiles)
      .map((r) => ({
        id: r.user.id,
        name: `${r.user.userProfiles!.first_name} ${r.user.userProfiles!.last_name}`,
        role: r.user.userProfiles!.role.name,
      }));
  }

  private async toGraphQL(thread: any, currentUserId: string, includeMessages: boolean) {
    const participants = await this.participantsFor(thread.id);
    const myParticipant = await this.prisma.messageParticipants.findUnique({
      where: { thread_id_user_id: { thread_id: thread.id, user_id: currentUserId } },
    });
    const result: any = {
      id: thread.id,
      participants,
      last_message: thread.last_message ?? undefined,
      last_activity: thread.last_activity,
      unread_count: myParticipant?.unread_count ?? 0,
    };
    if (includeMessages) {
      const messages = await this.prisma.messages.findMany({
        where: { thread_id: thread.id },
        include: { from: { include: { userProfiles: true } } },
        orderBy: { sent_at: 'asc' },
      });
      result.messages = messages.map((m) => ({
        id: m.id,
        from_id: m.from_id,
        from_name: m.from.userProfiles ? `${m.from.userProfiles.first_name} ${m.from.userProfiles.last_name}` : 'Unknown',
        body: m.body,
        sent_at: m.sent_at,
        read: !!m.read_at,
      }));
    }
    return result;
  }

  // Backs the "New Message" compose contact picker -- returns real Users.id
  // (via UserProfiles, the shared-PK 1:1 partner of Users) rather than
  // Patients.id/Clinicians.id, since that's what MessageParticipants.user_id
  // and createThread's participant_ids actually reference. Org-scoped like
  // every other tenant-facing list; self excluded.
  async messageableContacts(user: JwtPayload) {
    const rows = await this.prisma.userProfiles.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        id: { not: user.sub },
        // BUG006. This was `user.client_org_id ? {...} : {}`, which expands to
        // NO FILTER for an org-less caller — and `register` mints exactly that
        // (patient role, null org) for anyone on the public internet. With no
        // @Auth() anywhere on this resolver, a self-registered account read the
        // name and role of every user on the platform. Live-reproduced by
        // test/integration/tenancy.int-spec.ts before this fix.
        ...orgScope(user),
      },
      include: { role: true },
      orderBy: { first_name: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`, role: r.role.name }));
  }

  async threads(user: JwtPayload) {
    const participations = await this.prisma.messageParticipants.findMany({
      where: { user_id: user.sub },
      include: { thread: true },
      orderBy: { thread: { last_activity: 'desc' } },
    });
    return Promise.all(participations.map((p) => this.toGraphQL(p.thread, user.sub, false)));
  }

  async thread(id: string, user: JwtPayload) {
    const thread = await this.prisma.messageThreads.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException('Thread not found');
    const participant = await this.prisma.messageParticipants.findUnique({
      where: { thread_id_user_id: { thread_id: id, user_id: user.sub } },
    });
    if (!participant) throw new NotFoundException('Thread not found');
    return this.toGraphQL(thread, user.sub, true);
  }

  async sendMessage(threadId: string, body: string, user: JwtPayload) {
    const participant = await this.prisma.messageParticipants.findUnique({
      where: { thread_id_user_id: { thread_id: threadId, user_id: user.sub } },
    });
    if (!participant) throw new NotFoundException('Thread not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.messages.create({ data: { thread_id: threadId, from_id: user.sub, body } });
      await tx.messageThreads.update({ where: { id: threadId }, data: { last_message: body, last_activity: new Date() } });
      await tx.messageParticipants.updateMany({
        where: { thread_id: threadId, user_id: { not: user.sub } },
        data: { unread_count: { increment: 1 } },
      });
    });

    const thread = await this.prisma.messageThreads.findUnique({ where: { id: threadId } });
    const otherParticipants = await this.prisma.messageParticipants.findMany({
      where: { thread_id: threadId, user_id: { not: user.sub } },
    });
    for (const p of otherParticipants) {
      const payload = await this.toGraphQL(thread, p.user_id, false);
      await this.pubSub.publish(MESSAGE_RECEIVED_EVENT, { messageReceived: payload, userId: p.user_id });
      // REQ008/PLAN017
      await this.notificationTrigger.dispatch(p.user_id, 'new_message', {
        title: 'New message',
        message: body.length > 120 ? `${body.slice(0, 117)}...` : body,
        type: 'alert',
        action_url: `/messages/${threadId}`,
      });
    }
    return this.toGraphQL(thread, user.sub, true);
  }

  async markThreadRead(threadId: string, user: JwtPayload) {
    await this.prisma.messageParticipants.updateMany({
      where: { thread_id: threadId, user_id: user.sub },
      data: { unread_count: 0 },
    });
    return true;
  }

  async createThread(input: CreateThreadInput, user: JwtPayload) {
    if (!input.participant_ids.includes(user.sub)) {
      input.participant_ids = [...input.participant_ids, user.sub];
    }
    // MessageThreads.client_org_id is a required FK. An org-less caller
    // (admin/super_admin) has no org of their own to attach a thread to —
    // derive one from a participant who does, falling back to any existing
    // org as a last resort rather than inserting an invalid empty string.
    let clientOrgId = user.client_org_id;
    if (!clientOrgId) {
      const participantProfile = await this.prisma.userProfiles.findFirst({
        where: { id: { in: input.participant_ids }, client_org_id: { not: null } },
      });
      clientOrgId = participantProfile?.client_org_id ?? (await this.prisma.clientOrganizations.findFirst())?.id ?? null;
    }
    if (!clientOrgId) throw new BadRequestException('No organization available to attach this thread to');

    const thread = await this.prisma.$transaction(async (tx) => {
      const created = await tx.messageThreads.create({
        data: { client_org_id: clientOrgId!, last_message: input.first_message, last_activity: new Date() },
      });
      await tx.messageParticipants.createMany({
        data: input.participant_ids.map((user_id) => ({ thread_id: created.id, user_id, unread_count: 0 })),
      });
      await tx.messages.create({ data: { thread_id: created.id, from_id: user.sub, body: input.first_message } });
      await tx.messageParticipants.updateMany({
        where: { thread_id: created.id, user_id: { not: user.sub } },
        data: { unread_count: 1 },
      });
      return created;
    });
    return this.toGraphQL(thread, user.sub, true);
  }
}
