import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: {
    messageParticipants: { findMany: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; createMany: jest.Mock };
    messageThreads: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    messages: { findMany: jest.Mock; create: jest.Mock };
    userProfiles: { findMany: jest.Mock; findFirst: jest.Mock };
    clientOrganizations: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let pubSub: { publish: jest.Mock };
  let notificationTrigger: { dispatch: jest.Mock };

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
    messageParticipants: { updateMany: jest.fn(), createMany: jest.fn() },
  });

  beforeEach(async () => {
    prisma = {
      messageParticipants: { findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), createMany: jest.fn() },
      messageThreads: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      messages: { findMany: jest.fn(), create: jest.fn() },
      userProfiles: { findMany: jest.fn(), findFirst: jest.fn() },
      clientOrganizations: { findFirst: jest.fn() },
      $transaction: jest.fn((cb) => cb(makeTx())),
    };
    pubSub = { publish: jest.fn() };
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
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
        data: { client_org_id: 'org-a', last_message: 'hi', last_activity: expect.any(Date) },
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
});
