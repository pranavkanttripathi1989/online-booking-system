import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { DepartmentsService } from '../departments/departments.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: {
    messageParticipants: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; createMany: jest.Mock };
    messageThreads: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock; findMany: jest.Mock };
    messages: { findMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock };
    messageAttachments: { create: jest.Mock };
    cannedReplies: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    userProfiles: { findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
    clientOrganizations: { findFirst: jest.Mock; findUnique: jest.Mock };
    clinicians: { findMany: jest.Mock };
    clinics: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let pubSub: { publish: jest.Mock };
  let notificationTrigger: { dispatch: jest.Mock; isWithinQuietHours: jest.Mock };
  let departmentsService: { assertDepartmentInScope: jest.Mock };

  const meUser: JwtPayload = { sub: 'user-me', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-1', clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'user-admin', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const participantRow = (userId: string, profileOverrides = {}) => ({
    thread_id: 'thread-1',
    user_id: userId,
    unread_count: 2,
    user: {
      id: userId,
      userProfiles: { first_name: 'Jane', last_name: 'Doe', role: { name: 'clinician' }, ...profileOverrides },
    },
  });

  const thread1 = { id: 'thread-1', client_org_id: 'org-a', last_message: 'hi', last_activity: new Date() };

  const makeTx = () => ({
    messages: { create: jest.fn() },
    messageThreads: { update: jest.fn(), create: jest.fn() },
    messageParticipants: { updateMany: jest.fn(), createMany: jest.fn(), upsert: jest.fn() },
  });

  beforeEach(async () => {
    prisma = {
      messageParticipants: { findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), createMany: jest.fn() },
      messageThreads: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      messages: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
      messageAttachments: { create: jest.fn() },
      cannedReplies: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      userProfiles: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      clientOrganizations: { findFirst: jest.fn(), findUnique: jest.fn() },
      clinicians: { findMany: jest.fn() },
      clinics: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(makeTx())),
    };
    pubSub = { publish: jest.fn() };
    // Default: no clinical-hours config on file, so the auto-responder's
    // own early-return keeps every pre-existing sendMessage test unchanged.
    notificationTrigger = { dispatch: jest.fn(), isWithinQuietHours: jest.fn().mockReturnValue(false) };
    departmentsService = { assertDepartmentInScope: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
        { provide: DepartmentsService, useValue: departmentsService },
      ],
    }).compile();
    service = module.get(MessagesService);

    // default stubs so toGraphQL()'s internal calls resolve during unrelated tests
    prisma.messageParticipants.findMany.mockResolvedValue([participantRow('user-me'), participantRow('user-other')]);
    prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
    prisma.messages.findMany.mockResolvedValue([]);
  });

  describe('messageableContacts — tenant isolation', () => {
    it('scopes to the caller org and excludes self', async () => {
      prisma.userProfiles.findMany.mockResolvedValue([]);
      await service.messageableContacts(meUser);
      expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_deleted: false, is_active: true, id: { not: 'user-me' }, client_org_id: 'org-a' },
        }),
      );
    });

    it('does not scope by org for an org-less platform user', async () => {
      prisma.userProfiles.findMany.mockResolvedValue([]);
      await service.messageableContacts(platformUser);
      expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_deleted: false, is_active: true, id: { not: 'user-admin' } },
        }),
      );
    });
  });

  describe('threads — implicitly scoped to the caller\'s own participation', () => {
    it('queries messageParticipants filtered by the caller user id, not an unscoped thread list', async () => {
      prisma.messageParticipants.findMany
        .mockResolvedValueOnce([{ thread_id: 'thread-1', user_id: 'user-me', thread: thread1 }])
        .mockResolvedValue([participantRow('user-me')]);
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      await service.threads(meUser);
      expect(prisma.messageParticipants.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: 'user-me' } }),
      );
    });

    // F-15 (project-plans/02-findings-register.md) — toGraphQL()'s own
    // participantsFor() call used to issue one messageParticipants.findMany
    // PER thread. For a caller with N threads, threads() must now issue a
    // bounded number of calls regardless of N, not one per thread.
    it('batches every thread\'s participants into one query, not one per thread', async () => {
      const thread2 = { id: 'thread-2', client_org_id: 'org-a', last_message: 'hey', last_activity: new Date() };
      prisma.messageParticipants.findMany
        .mockResolvedValueOnce([
          { thread_id: 'thread-1', user_id: 'user-me', thread: thread1 },
          { thread_id: 'thread-2', user_id: 'user-me', thread: thread2 },
        ])
        .mockResolvedValueOnce([
          participantRow('user-me'),
          { ...participantRow('user-other'), thread_id: 'thread-2' },
        ]);
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));

      const result = await service.threads(meUser);

      // Exactly 2 calls total: the caller's own participations, then one
      // batched query for every thread's participants -- never N+1.
      expect(prisma.messageParticipants.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.messageParticipants.findMany).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ where: { thread_id: { in: ['thread-1', 'thread-2'] } } }),
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('thread — cross-user access rejected (self-scoping equivalent)', () => {
    it('rejects when the thread does not exist', async () => {
      prisma.messageThreads.findUnique.mockResolvedValue(null);
      await expect(service.thread('missing', meUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a caller who is not a participant of an existing thread, without leaking it', async () => {
      prisma.messageThreads.findUnique.mockResolvedValue(thread1);
      prisma.messageParticipants.findUnique.mockResolvedValue(null); // caller not a participant
      await expect(service.thread('thread-1', meUser)).rejects.toThrow(NotFoundException);
    });

    it('returns the thread with messages for an actual participant', async () => {
      prisma.messageThreads.findUnique.mockResolvedValue(thread1);
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      const result = await service.thread('thread-1', meUser);
      expect(result.id).toBe('thread-1');
    });
  });

  describe('sendMessage — cross-user access rejected', () => {
    it('rejects a caller who is not a participant of the thread', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage('thread-1', 'hi', meUser)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('writes the message and notifies only the other participants, not the sender', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      prisma.messageThreads.findUnique.mockResolvedValue(thread1);
      // First findMany call is the raw otherParticipants lookup (just user_id);
      // subsequent calls go through toGraphQL/participantsFor and need the full shape.
      prisma.messageParticipants.findMany.mockResolvedValueOnce([{ thread_id: 'thread-1', user_id: 'user-other' }]);

      await service.sendMessage('thread-1', 'hello there', meUser);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(pubSub.publish).toHaveBeenCalledTimes(1);
      const [, payload] = pubSub.publish.mock.calls[0];
      expect(payload.userId).toBe('user-other');

      // REQ008/PLAN017
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'user-other',
        'new_message',
        expect.objectContaining({ type: 'alert' }),
      );
      expect(notificationTrigger.dispatch).not.toHaveBeenCalledWith('user-me', expect.anything(), expect.anything());
    });

    // REQ024 (US-MSG-04) — clinical-hours auto-responder.
    describe('clinical-hours auto-reply', () => {
      const patientThread = { id: 'thread-1', client_org_id: 'org-a', thread_type: 'patient_clinic', assigned_to_user_id: 'staff-1' };
      const org = { clinical_hours_start: '09:00', clinical_hours_end: '18:00', clinical_hours_auto_reply_message: 'We are closed, back at 9am.' };

      beforeEach(() => {
        prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
        prisma.messageThreads.findUnique.mockResolvedValue(patientThread);
        prisma.messageParticipants.findMany.mockResolvedValueOnce([{ thread_id: 'thread-1', user_id: 'staff-1' }]);
      });

      it('does nothing when the thread is not patient_clinic', async () => {
        prisma.messageThreads.findUnique.mockResolvedValue({ ...patientThread, thread_type: 'staff_internal' });
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        await service.sendMessage('thread-1', 'hello', meUser);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1); // sendMessage's own transaction only
      });

      it('does nothing when the sender is not a patient', async () => {
        const staffUser = { sub: 'staff-2', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
        prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('staff-2'));
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        await service.sendMessage('thread-1', 'hello', staffUser);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      });

      it('does nothing when the thread has no assigned staff member', async () => {
        prisma.messageThreads.findUnique.mockResolvedValue({ ...patientThread, assigned_to_user_id: null });
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        await service.sendMessage('thread-1', 'hello', meUser);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      });

      it('does nothing when clinical hours are not fully configured for the org', async () => {
        prisma.clientOrganizations.findUnique.mockResolvedValue({ clinical_hours_start: '09:00', clinical_hours_end: null, clinical_hours_auto_reply_message: null });
        await service.sendMessage('thread-1', 'hello', meUser);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      });

      it('does nothing when the message arrives inside clinical hours', async () => {
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        // maybeSendClinicalHoursAutoReply reuses isWithinQuietHours() against
        // the clinical_hours_start/end window itself: true means "now falls
        // inside that window" (i.e. the clinic is open), which suppresses
        // the auto-reply.
        notificationTrigger.isWithinQuietHours.mockReturnValue(true);
        await service.sendMessage('thread-1', 'hello', meUser);
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      });

      it('sends an auto-reply from the assignee when outside clinical hours and none sent yet this burst', async () => {
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        notificationTrigger.isWithinQuietHours.mockReturnValue(false); // outside the clinical-hours window — clinic closed
        // First messages.findMany call is maybeSendClinicalHoursAutoReply's own
        // lastTwo lookup; the second is the final toGraphQL(includeMessages:true)
        // call, whose content is irrelevant to this assertion.
        prisma.messages.findMany.mockResolvedValueOnce([
          { from_id: 'user-me', sent_at: new Date() }, // lastTwo[0]: the message just sent
          { from_id: 'user-other', sent_at: new Date() }, // lastTwo[1]: not the assignee
        ]).mockResolvedValueOnce([]);

        await service.sendMessage('thread-1', 'hello', meUser);

        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      });

      it('skips a second auto-reply within the same burst', async () => {
        prisma.clientOrganizations.findUnique.mockResolvedValue(org);
        notificationTrigger.isWithinQuietHours.mockReturnValue(false);
        prisma.messages.findMany.mockResolvedValueOnce([
          { from_id: 'user-me', sent_at: new Date() },
          { from_id: 'staff-1', sent_at: new Date() }, // lastTwo[1]: the assignee's own prior auto-reply
        ]).mockResolvedValueOnce([]);

        await service.sendMessage('thread-1', 'hello', meUser);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('createThread', () => {
    it('adds the caller to participant_ids if they omitted themselves', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      prisma.clientOrganizations.findFirst.mockResolvedValue(null);
      prisma.messageThreads.create = jest.fn();
      const tx = makeTx();
      tx.messageThreads.create.mockResolvedValue(thread1);
      prisma.$transaction.mockImplementation((cb) => cb(tx));

      await service.createThread({ participant_ids: ['user-other'], first_message: 'hi' } as any, meUser);
      expect(tx.messageParticipants.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { thread_id: thread1.id, user_id: 'user-other', unread_count: 0 },
          { thread_id: thread1.id, user_id: 'user-me', unread_count: 0 },
        ]),
      });
    });

    it('uses the caller org when present', async () => {
      const tx = makeTx();
      tx.messageThreads.create.mockResolvedValue(thread1);
      prisma.$transaction.mockImplementation((cb) => cb(tx));

      await service.createThread({ participant_ids: ['user-me', 'user-other'], first_message: 'hi' } as any, meUser);
      expect(tx.messageThreads.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ client_org_id: 'org-a', last_message: 'hi', last_activity: expect.any(Date) }),
      });
    });

    it('derives client_org_id from a participant when the caller is org-less', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue({ client_org_id: 'org-derived' });
      const tx = makeTx();
      tx.messageThreads.create.mockResolvedValue({ ...thread1, client_org_id: 'org-derived' });
      prisma.$transaction.mockImplementation((cb) => cb(tx));

      await service.createThread(
        { participant_ids: ['user-other'], first_message: 'hi' } as any,
        platformUser,
      );
      expect(tx.messageThreads.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-derived' }) }),
      );
    });

    it('falls back to any existing org, and finally rejects if truly none exists', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      prisma.clientOrganizations.findFirst.mockResolvedValue(null);
      await expect(
        service.createThread({ participant_ids: ['user-other'], first_message: 'hi' } as any, platformUser),
      ).rejects.toThrow(BadRequestException);
    });

    // REQ058 (US-MSG-01) — department/branch scoping.
    describe('department/clinic scoping', () => {
      it('rejects a department outside the caller\'s org (via assertDepartmentInScope)', async () => {
        departmentsService.assertDepartmentInScope.mockRejectedValue(new BadRequestException('Department not found'));
        await expect(
          service.createThread({ participant_ids: ['user-other'], first_message: 'hi', department_id: 'dept-b' } as any, meUser),
        ).rejects.toThrow('Department not found');
      });

      it('rejects a clinic outside the caller\'s org', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
        await expect(
          service.createThread({ participant_ids: ['user-other'], first_message: 'hi', clinic_id: 'clinic-b' } as any, meUser),
        ).rejects.toThrow('Clinic not found');
      });

      it('auto-adds every department member as a participant, derives clinic_id from the department', async () => {
        departmentsService.assertDepartmentInScope.mockResolvedValue({ id: 'dept-a', clinic_id: 'clinic-a', client_org_id: 'org-a' });
        prisma.clinicians.findMany.mockResolvedValue([{ id: 'clinician-1' }, { id: 'clinician-2' }]);
        prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-dept-1' }, { id: 'user-dept-2' }]);
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue({ ...thread1, department_id: 'dept-a', clinic_id: 'clinic-a' });
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread(
          { participant_ids: ['user-other'], first_message: 'hi', department_id: 'dept-a' } as any,
          meUser,
        );

        expect(prisma.clinicians.findMany).toHaveBeenCalledWith({ where: { department_id: 'dept-a' }, select: { id: true } });
        expect(tx.messageThreads.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ department_id: 'dept-a', clinic_id: 'clinic-a' }) }),
        );
        const call = tx.messageParticipants.createMany.mock.calls[0][0];
        const addedIds = call.data.map((d: any) => d.user_id);
        expect(addedIds).toEqual(expect.arrayContaining(['user-other', 'user-me', 'user-dept-1', 'user-dept-2']));
      });

      // REQ102 — a staff member with department_id_ref set is included even
      // with zero clinicians in that department (the pre-existing early
      // `if (!clinicianIds.length) return []` this slice removed).
      it('includes a non-clinician staff member via department_id_ref even when the department has no clinicians', async () => {
        departmentsService.assertDepartmentInScope.mockResolvedValue({ id: 'dept-a', clinic_id: 'clinic-a', client_org_id: 'org-a' });
        prisma.clinicians.findMany.mockResolvedValue([]);
        prisma.userProfiles.findMany.mockResolvedValue([{ id: 'staff-dept-1' }]);
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue({ ...thread1, department_id: 'dept-a', clinic_id: 'clinic-a' });
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread(
          { participant_ids: ['user-other'], first_message: 'hi', department_id: 'dept-a' } as any,
          meUser,
        );

        expect(prisma.userProfiles.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: expect.objectContaining({ department_id_ref: 'dept-a' }) }),
        );
        const call = tx.messageParticipants.createMany.mock.calls[0][0];
        const addedIds = call.data.map((d: any) => d.user_id);
        expect(addedIds).toEqual(expect.arrayContaining(['staff-dept-1']));
      });

      // REQ102 — a profile reachable via both the clinician path and the
      // direct staff-department path must not be added as a duplicate
      // participant.
      it('does not add a duplicate participant when reachable via both the clinician and staff paths', async () => {
        departmentsService.assertDepartmentInScope.mockResolvedValue({ id: 'dept-a', clinic_id: 'clinic-a', client_org_id: 'org-a' });
        prisma.clinicians.findMany.mockResolvedValue([{ id: 'clinician-1' }]);
        prisma.userProfiles.findMany.mockResolvedValue([{ id: 'same-user' }]);
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue({ ...thread1, department_id: 'dept-a', clinic_id: 'clinic-a' });
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread(
          { participant_ids: ['user-other'], first_message: 'hi', department_id: 'dept-a' } as any,
          meUser,
        );

        const call = tx.messageParticipants.createMany.mock.calls[0][0];
        const addedIds = call.data.map((d: any) => d.user_id);
        expect(addedIds.filter((id: string) => id === 'same-user')).toHaveLength(1);
      });

      it('auto-adds every clinic member as a participant for a branch-wide (no-department) thread', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-a', client_org_id: 'org-a', is_deleted: false });
        prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-branch-1' }]);
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue({ ...thread1, clinic_id: 'clinic-a' });
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread(
          { participant_ids: ['user-other'], first_message: 'hi', clinic_id: 'clinic-a' } as any,
          meUser,
        );

        expect(prisma.userProfiles.findMany).toHaveBeenCalledWith({ where: { clinic_id: 'clinic-a', is_deleted: false }, select: { id: true } });
        const call = tx.messageParticipants.createMany.mock.calls[0][0];
        const addedIds = call.data.map((d: any) => d.user_id);
        expect(addedIds).toEqual(expect.arrayContaining(['user-other', 'user-me', 'user-branch-1']));
      });

      it('does not duplicate a scoped member who was already an explicit participant', async () => {
        prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-a', client_org_id: 'org-a', is_deleted: false });
        prisma.userProfiles.findMany.mockResolvedValue([{ id: 'user-other' }]); // already in participant_ids
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue({ ...thread1, clinic_id: 'clinic-a' });
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread(
          { participant_ids: ['user-other'], first_message: 'hi', clinic_id: 'clinic-a' } as any,
          meUser,
        );

        const call = tx.messageParticipants.createMany.mock.calls[0][0];
        const addedIds = call.data.map((d: any) => d.user_id);
        expect(addedIds.filter((id: string) => id === 'user-other')).toHaveLength(1);
      });
    });

    // REQ024 (US-MSG-04) — thread_type inference, which the auto-responder
    // depends on to know whether a thread is patient-facing at all.
    describe('thread_type inference', () => {
      it('infers patient_clinic when any participant is a patient', async () => {
        prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-other' }); // matched the patient-role query
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue(thread1);
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread({ participant_ids: ['user-other'], first_message: 'hi' } as any, meUser);

        expect(tx.messageThreads.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ thread_type: 'patient_clinic' }) }),
        );
      });

      it('infers staff_internal when no participant is a patient', async () => {
        prisma.userProfiles.findFirst.mockResolvedValue(null); // no patient-role match
        const tx = makeTx();
        tx.messageThreads.create.mockResolvedValue(thread1);
        prisma.$transaction.mockImplementation((cb) => cb(tx));

        await service.createThread({ participant_ids: ['user-other'], first_message: 'hi' } as any, meUser);

        expect(tx.messageThreads.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ thread_type: 'staff_internal' }) }),
        );
      });
    });
  });

  // REQ058 (US-MSG-01) — the "or Org Admin" oversight path.
  describe('departmentThreads', () => {
    it('rejects a department outside the caller\'s org', async () => {
      departmentsService.assertDepartmentInScope.mockRejectedValue(new BadRequestException('Department not found'));
      await expect(service.departmentThreads('dept-b', meUser)).rejects.toThrow('Department not found');
    });

    it('lists every thread for the department, regardless of the caller\'s own participation', async () => {
      departmentsService.assertDepartmentInScope.mockResolvedValue({ id: 'dept-a', clinic_id: 'clinic-a', client_org_id: 'org-a' });
      prisma.messageThreads.findMany.mockResolvedValue([{ ...thread1, department_id: 'dept-a' }]);
      const result = await service.departmentThreads('dept-a', meUser);
      expect(prisma.messageThreads.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { department_id: 'dept-a' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // REQ058 (US-MSG-03).
  describe('canned replies', () => {
    const managerUser: JwtPayload = { sub: 'mgr-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

    it('cannedReplies() scopes to the caller\'s own org', async () => {
      prisma.cannedReplies.findMany.mockResolvedValue([]);
      await service.cannedReplies(managerUser);
      expect(prisma.cannedReplies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('createCannedReply rejects an org-less caller', async () => {
      const result = await service.createCannedReply({ title: 'Reminder', body: 'Please arrive 10 min early' } as any, platformUser);
      expect(result.success).toBe(false);
    });

    it('createCannedReply stamps the caller\'s own org and creator id', async () => {
      prisma.cannedReplies.create.mockResolvedValue({ id: 'cr-1', title: 'Reminder', body: 'text', created_at: new Date() });
      const result = await service.createCannedReply({ title: 'Reminder', body: 'text' } as any, managerUser);
      expect(result.success).toBe(true);
      expect(prisma.cannedReplies.create).toHaveBeenCalledWith({
        data: { client_org_id: 'org-a', created_by_user_id: 'mgr-1', title: 'Reminder', body: 'text' },
      });
    });

    it('updateCannedReply rejects a cross-org reply, never confirming it exists', async () => {
      prisma.cannedReplies.findUnique.mockResolvedValue({ id: 'cr-1', client_org_id: 'org-b', is_deleted: false });
      const result = await service.updateCannedReply('cr-1', { title: 'x' } as any, managerUser);
      expect(result.success).toBe(false);
    });

    it('deleteCannedReply soft-deletes a reply in the caller\'s own org', async () => {
      prisma.cannedReplies.findUnique.mockResolvedValue({ id: 'cr-1', client_org_id: 'org-a', is_deleted: false });
      const result = await service.deleteCannedReply('cr-1', managerUser);
      expect(result.success).toBe(true);
      expect(prisma.cannedReplies.update).toHaveBeenCalledWith({ where: { id: 'cr-1' }, data: { is_deleted: true } });
    });
  });

  // REQ058 (US-MSG-01) — message attachments.
  describe('createMessageAttachment', () => {
    it('rejects a nonexistent message', async () => {
      prisma.messages.findUnique.mockResolvedValue(null);
      await expect(
        service.createMessageAttachment({ message_id: 'msg-1', file_ref: '/x', mime_type: 'image/png', original_filename: 'x.png' } as any, meUser),
      ).rejects.toThrow('Message not found');
    });

    it('rejects a caller who is not a participant of the message\'s thread', async () => {
      prisma.messages.findUnique.mockResolvedValue({ id: 'msg-1', thread_id: 'thread-1' });
      prisma.messageParticipants.findUnique.mockResolvedValue(null);
      await expect(
        service.createMessageAttachment({ message_id: 'msg-1', file_ref: '/x', mime_type: 'image/png', original_filename: 'x.png' } as any, meUser),
      ).rejects.toThrow('Message not found');
    });

    it('creates the attachment row for a participant', async () => {
      prisma.messages.findUnique.mockResolvedValue({ id: 'msg-1', thread_id: 'thread-1' });
      prisma.messageParticipants.findUnique.mockResolvedValue({ thread_id: 'thread-1', user_id: 'user-me' });
      prisma.messageAttachments.create.mockResolvedValue({
        id: 'att-1', file_ref: '/uploads/message-attachments/x.png', mime_type: 'image/png', original_filename: 'x.png', created_at: new Date(),
      });
      const result = await service.createMessageAttachment(
        { message_id: 'msg-1', file_ref: '/uploads/message-attachments/x.png', mime_type: 'image/png', original_filename: 'x.png' } as any,
        meUser,
      );
      expect(result.id).toBe('att-1');
      expect(prisma.messageAttachments.create).toHaveBeenCalledWith({
        data: { message_id: 'msg-1', file_ref: '/uploads/message-attachments/x.png', mime_type: 'image/png', original_filename: 'x.png', uploaded_by_id: 'user-me' },
      });
    });
  });

  describe('markThreadRead', () => {
    it('scopes the reset to the calling user only', async () => {
      prisma.messageParticipants.updateMany.mockResolvedValue({ count: 1 });
      await service.markThreadRead('thread-1', meUser);
      expect(prisma.messageParticipants.updateMany).toHaveBeenCalledWith({
        where: { thread_id: 'thread-1', user_id: 'user-me' },
        data: { unread_count: 0 },
      });
    });
  });

  describe('assignThread (REQ043)', () => {
    // Same org as thread1 ('org-a') -- represents the real happy-path
    // assignee. Tests exercising the cross-tenant rejection below override
    // client_org_id explicitly rather than relying on this default.
    const assigneeProfile = { id: 'user-other', is_deleted: false, client_org_id: 'org-a' };

    it('rejects a caller who is not a participant of the thread', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(null);
      await expect(service.assignThread('thread-1', 'user-other', meUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects an assignee that does not exist', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      prisma.messageThreads.findUnique.mockResolvedValue(thread1);
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await expect(service.assignThread('thread-1', 'user-ghost', meUser)).rejects.toThrow(NotFoundException);
    });

    // REQ043 cross-tenant fix: assignThread's assignee lookup had no org
    // check at all -- any thread participant could assign (and thereby
    // grant thread-read access to, via the participant upsert) a user from
    // a completely different org. Same rejection as "assignee doesn't
    // exist" -- never confirm cross-tenant existence.
    it('rejects an assignee who belongs to a different org than the thread, never confirming they exist', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      prisma.messageThreads.findUnique.mockResolvedValue(thread1); // client_org_id: 'org-a'
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-other-org', is_deleted: false, client_org_id: 'org-b' });

      await expect(service.assignThread('thread-1', 'user-other-org', meUser)).rejects.toThrow(
        new NotFoundException('Assignee not found'),
      );
    });

    it('sets assigned_to_user_id and starts the SLA clock on first assignment', async () => {
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      prisma.messageParticipants.findMany.mockResolvedValue([]);
      prisma.userProfiles.findFirst.mockResolvedValue(assigneeProfile);
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.messageThreads.findUnique.mockResolvedValueOnce({ ...thread1, sla_due_at: null }).mockResolvedValueOnce({ ...thread1, sla_due_at: new Date() });
      const tx = makeTx();
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      await service.assignThread('thread-1', 'user-other', meUser);

      expect(tx.messageThreads.update).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        data: { assigned_to_user_id: 'user-other', sla_due_at: expect.any(Date) },
      });
      expect(tx.messageParticipants.upsert).toHaveBeenCalledWith({
        where: { thread_id_user_id: { thread_id: 'thread-1', user_id: 'user-other' } },
        create: { thread_id: 'thread-1', user_id: 'user-other', unread_count: 0 },
        update: {},
      });
    });

    it('does not reset an already-running SLA clock on reassignment', async () => {
      const existingDueAt = new Date('2026-01-01T00:00:00.000Z');
      prisma.messageParticipants.findUnique.mockResolvedValue(participantRow('user-me'));
      prisma.messageParticipants.findMany.mockResolvedValue([]);
      prisma.userProfiles.findFirst.mockResolvedValue(assigneeProfile);
      prisma.userProfiles.findUnique.mockResolvedValue(null);
      prisma.messageThreads.findUnique.mockResolvedValueOnce({ ...thread1, sla_due_at: existingDueAt }).mockResolvedValueOnce({ ...thread1, sla_due_at: existingDueAt });
      const tx = makeTx();
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      await service.assignThread('thread-1', 'user-other', meUser);

      expect(tx.messageThreads.update).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        data: { assigned_to_user_id: 'user-other', sla_due_at: existingDueAt },
      });
    });
  });
});
