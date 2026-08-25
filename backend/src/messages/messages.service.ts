import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadInput, CreateCannedReplyInput, UpdateCannedReplyInput, CreateMessageAttachmentInput } from './dto/message.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PUB_SUB } from '../common/pubsub.provider';
import { orgScope, isSameOrg } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { DepartmentsService } from '../departments/departments.service';

export const MESSAGE_RECEIVED_EVENT = 'messageReceived';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly departmentsService: DepartmentsService,
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

  private async assigneeFor(assignedToUserId: string | null) {
    if (!assignedToUserId) return undefined;
    const row = await this.prisma.userProfiles.findUnique({ where: { id: assignedToUserId }, include: { role: true } });
    if (!row) return undefined;
    return { id: row.id, name: `${row.first_name} ${row.last_name}`, role: row.role.name };
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
      assigned_to: await this.assigneeFor(thread.assigned_to_user_id),
      sla_due_at: thread.sla_due_at ?? undefined,
      // REQ058 (US-MSG-01).
      thread_type: thread.thread_type,
      department_id: thread.department_id ?? undefined,
      clinic_id: thread.clinic_id ?? undefined,
    };
    if (includeMessages) {
      const messages = await this.prisma.messages.findMany({
        where: { thread_id: thread.id },
        include: { from: { include: { userProfiles: true } }, attachments: true },
        orderBy: { sent_at: 'asc' },
      });
      result.messages = messages.map((m) => ({
        id: m.id,
        from_id: m.from_id,
        from_name: m.from.userProfiles ? `${m.from.userProfiles.first_name} ${m.from.userProfiles.last_name}` : 'Unknown',
        body: m.body,
        sent_at: m.sent_at,
        read: !!m.read_at,
        attachments: m.attachments.map((a) => ({
          id: a.id,
          file_ref: a.file_ref,
          mime_type: a.mime_type,
          original_filename: a.original_filename,
          created_at: a.created_at,
        })),
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

    await this.maybeSendClinicalHoursAutoReply(thread, user);

    return this.toGraphQL(thread, user.sub, true);
  }

  // REQ024 (US-MSG-04) — an auto-reply on a patient<->clinic thread when a
  // patient messages outside the org's configured clinical hours. Fires at
  // most once per still-outside-hours "burst": if the thread's own most
  // recent message before this one already IS an auto-reply, skip sending
  // another (a patient sending several messages in a row overnight gets
  // one notice, not one per message). Off by default -- all three fields
  // (start/end/message) must be explicitly configured, and the thread
  // needs a real assigned staff member to send "from" (no fabricated
  // system sender identity — see PLAN093/REQ065's own precedent for why
  // this codebase doesn't invent one).
  private async maybeSendClinicalHoursAutoReply(thread: { id: string; thread_type: string; client_org_id: string; assigned_to_user_id: string | null } | null, user: JwtPayload) {
    if (!thread || thread.thread_type !== 'patient_clinic' || !user.roles.includes('patient') || !thread.assigned_to_user_id) return;

    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: thread.client_org_id } });
    if (!org?.clinical_hours_start || !org.clinical_hours_end || !org.clinical_hours_auto_reply_message) return;
    if (this.notificationTrigger.isWithinQuietHours(org.clinical_hours_start, org.clinical_hours_end, new Date())) return;

    const lastTwo = await this.prisma.messages.findMany({
      where: { thread_id: thread.id },
      orderBy: { sent_at: 'desc' },
      take: 2,
    });
    // lastTwo[0] is the message sendMessage() just created above; [1] is
    // whatever preceded it. An auto-reply from the assignee immediately
    // before this patient message means one already went out this burst.
    const alreadyReplied = lastTwo[1]?.from_id === thread.assigned_to_user_id;
    if (alreadyReplied) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.messages.create({ data: { thread_id: thread.id, from_id: thread.assigned_to_user_id as string, body: org.clinical_hours_auto_reply_message as string } });
      await tx.messageThreads.update({ where: { id: thread.id }, data: { last_message: org.clinical_hours_auto_reply_message as string, last_activity: new Date() } });
      await tx.messageParticipants.updateMany({
        where: { thread_id: thread.id, user_id: { not: thread.assigned_to_user_id as string } },
        data: { unread_count: { increment: 1 } },
      });
    });
  }

  async markThreadRead(threadId: string, user: JwtPayload) {
    await this.prisma.messageParticipants.updateMany({
      where: { thread_id: threadId, user_id: user.sub },
      data: { unread_count: 0 },
    });
    return true;
  }

  // REQ043/REQ024 -- shared-inbox assignment. Caller must already be a
  // participant (matches every other thread-mutating method's access
  // check); the assignee is added as a participant if not already one, so
  // assignment actually gives them a way to see and respond to the thread,
  // not just a label pointing at someone who can't act on it.
  //
  // sla_due_at is set only on the FIRST assignment (SLA_WINDOW_HOURS from
  // now) -- reassigning an already-assigned thread to someone else doesn't
  // reset the clock, since the org's response-time commitment to whoever
  // sent the original message didn't change just because ownership moved.
  async assignThread(threadId: string, assigneeUserId: string, user: JwtPayload) {
    const SLA_WINDOW_HOURS = 24;
    const participant = await this.prisma.messageParticipants.findUnique({
      where: { thread_id_user_id: { thread_id: threadId, user_id: user.sub } },
    });
    if (!participant) throw new NotFoundException('Thread not found');

    const thread = await this.prisma.messageThreads.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');

    // Cross-tenant gap: the assignee lookup had no org check at all, so any
    // thread participant could assign (and thereby grant thread-read access
    // to, via the participant upsert below) a user from a completely
    // different org. Same not-found rejection for "doesn't exist" and
    // "exists but wrong org" -- never confirm cross-tenant existence,
    // matching assertSameOrg()'s convention elsewhere in this codebase.
    const assignee = await this.prisma.userProfiles.findFirst({ where: { id: assigneeUserId, is_deleted: false } });
    if (!assignee || assignee.client_org_id !== thread.client_org_id) {
      throw new NotFoundException('Assignee not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.messageThreads.update({
        where: { id: threadId },
        data: {
          assigned_to_user_id: assigneeUserId,
          sla_due_at: thread.sla_due_at ?? new Date(Date.now() + SLA_WINDOW_HOURS * 60 * 60 * 1000),
        },
      });
      await tx.messageParticipants.upsert({
        where: { thread_id_user_id: { thread_id: threadId, user_id: assigneeUserId } },
        create: { thread_id: threadId, user_id: assigneeUserId, unread_count: 0 },
        update: {},
      });
    });

    const updated = await this.prisma.messageThreads.findUnique({ where: { id: threadId } });
    return this.toGraphQL(updated, user.sub, false);
  }

  // REQ058 (US-MSG-01) — "only department members (or Org Admin) see a
  // department-scoped group thread" is satisfied at CREATE time, not by a
  // dynamic read-time visibility rule: every department (or clinic-wide)
  // member is added as an explicit MessageParticipants row here, so
  // threads()/thread()'s own pre-existing "caller must be an explicit
  // participant" check (unchanged by this slice) already gives them
  // access, with zero risk of regressing that check's existing behaviour
  // for every unscoped thread. An Org Admin who isn't a department member
  // themselves is NOT auto-added (they weren't a participant of any
  // thread before this slice either) -- see departmentThreads() below for
  // the oversight path that doesn't require participation.
  private async resolveScopedMemberUserIds(departmentId: string | undefined, clinicId: string | undefined) {
    if (departmentId) {
      const clinicians = await this.prisma.clinicians.findMany({ where: { department_id: departmentId }, select: { id: true } });
      const clinicianIds = clinicians.map((c) => c.id);
      if (!clinicianIds.length) return [];
      const profiles = await this.prisma.userProfiles.findMany({
        where: { clinician_id: { in: clinicianIds }, is_deleted: false },
        select: { id: true },
      });
      return profiles.map((p) => p.id);
    }
    if (clinicId) {
      const profiles = await this.prisma.userProfiles.findMany({ where: { clinic_id: clinicId, is_deleted: false }, select: { id: true } });
      return profiles.map((p) => p.id);
    }
    return [];
  }

  // REQ024 (US-MSG-04) — a thread with any patient participant is
  // patient_clinic (the "future, still-P1 story" this column's own
  // comment names); everything else stays staff_internal, the pre-
  // existing default. Derived from participant roles rather than an
  // explicit caller-supplied thread_type input, since a caller has no
  // reason to lie about who they're messaging and inferring it here means
  // every existing createThread() call site keeps working unchanged.
  private async inferThreadType(participantIds: string[]): Promise<string> {
    const patientParticipant = await this.prisma.userProfiles.findFirst({
      where: { id: { in: participantIds }, role: { name: 'patient' } },
    });
    return patientParticipant ? 'patient_clinic' : 'staff_internal';
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

    // REQ058 (US-MSG-01) — department_id (Hard Rule 6: a cross-domain FK
    // in the input) requires the caller's own org own it. clinic_id is
    // ALWAYS derived from the department when one is given (denormalized
    // for a single-column WHERE at read time) -- a separately-supplied
    // clinic_id is only honoured when no department was given, for a
    // branch-wide (not department-specific) thread.
    let departmentId: string | undefined;
    let clinicId: string | undefined;
    if (input.department_id) {
      const department = await this.departmentsService.assertDepartmentInScope(input.department_id, user);
      departmentId = department.id;
      clinicId = department.clinic_id;
    } else if (input.clinic_id) {
      const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
      if (!clinic || clinic.is_deleted || !isSameOrg(user, clinic.client_org_id)) {
        throw new BadRequestException('Clinic not found');
      }
      clinicId = clinic.id;
    }
    const scopedMemberIds = await this.resolveScopedMemberUserIds(departmentId, clinicId);
    const allParticipantIds = [...new Set([...input.participant_ids, ...scopedMemberIds])];
    const threadType = await this.inferThreadType(allParticipantIds);

    const thread = await this.prisma.$transaction(async (tx) => {
      const created = await tx.messageThreads.create({
        data: {
          client_org_id: clientOrgId!,
          last_message: input.first_message,
          last_activity: new Date(),
          department_id: departmentId,
          clinic_id: clinicId,
          thread_type: threadType,
        },
      });
      await tx.messageParticipants.createMany({
        data: allParticipantIds.map((user_id) => ({ thread_id: created.id, user_id, unread_count: 0 })),
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

  // REQ058 (US-MSG-01) — the "or Org Admin" half of the AC: an oversight
  // list for a manager+ caller who is NOT necessarily an explicit
  // participant of every thread in the department (unlike threads(), which
  // is deliberately unchanged by this slice).
  async departmentThreads(departmentId: string, user: JwtPayload) {
    const department = await this.departmentsService.assertDepartmentInScope(departmentId, user);
    const rows = await this.prisma.messageThreads.findMany({
      where: { department_id: department.id },
      orderBy: { last_activity: 'desc' },
    });
    return Promise.all(rows.map((r) => this.toGraphQL(r, user.sub, false)));
  }

  // REQ058 (US-MSG-03).
  async cannedReplies(user: JwtPayload) {
    const rows = await this.prisma.cannedReplies.findMany({
      where: { is_deleted: false, ...orgScope(user) },
      orderBy: { title: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, created_at: r.created_at }));
  }

  async createCannedReply(input: CreateCannedReplyInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: "Your account isn't linked to an organization" }] };
    }
    try {
      const row = await this.prisma.cannedReplies.create({
        data: { client_org_id: user.client_org_id, created_by_user_id: user.sub, title: input.title, body: input.body },
      });
      return { success: true, userErrors: [], cannedReply: { id: row.id, title: row.title, body: row.body, created_at: row.created_at } };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create canned reply' }] };
    }
  }

  private async findOwnedCannedReply(id: string, user: JwtPayload) {
    const row = await this.prisma.cannedReplies.findUnique({ where: { id } });
    if (!row || row.is_deleted) return null;
    if (user.client_org_id && row.client_org_id !== user.client_org_id) return null;
    return row;
  }

  async updateCannedReply(id: string, input: UpdateCannedReplyInput, user: JwtPayload) {
    const existing = await this.findOwnedCannedReply(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Canned reply not found' }] };
    try {
      const row = await this.prisma.cannedReplies.update({
        where: { id },
        data: { title: input.title, body: input.body },
      });
      return { success: true, userErrors: [], cannedReply: { id: row.id, title: row.title, body: row.body, created_at: row.created_at } };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update canned reply' }] };
    }
  }

  async deleteCannedReply(id: string, user: JwtPayload) {
    const existing = await this.findOwnedCannedReply(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Canned reply not found' }] };
    await this.prisma.cannedReplies.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // REQ058 (US-MSG-01) — the DB-row-creation half of the upload; the
  // caller must already be a participant of the thread the target message
  // belongs to, matching sendMessage()'s own access check.
  async createMessageAttachment(input: CreateMessageAttachmentInput, user: JwtPayload) {
    const message = await this.prisma.messages.findUnique({ where: { id: input.message_id } });
    if (!message) throw new NotFoundException('Message not found');
    const participant = await this.prisma.messageParticipants.findUnique({
      where: { thread_id_user_id: { thread_id: message.thread_id, user_id: user.sub } },
    });
    if (!participant) throw new NotFoundException('Message not found');

    const row = await this.prisma.messageAttachments.create({
      data: {
        message_id: input.message_id,
        file_ref: input.file_ref,
        mime_type: input.mime_type,
        original_filename: input.original_filename,
        uploaded_by_id: user.sub,
      },
    });
    return { id: row.id, file_ref: row.file_ref, mime_type: row.mime_type, original_filename: row.original_filename, created_at: row.created_at };
  }
}
