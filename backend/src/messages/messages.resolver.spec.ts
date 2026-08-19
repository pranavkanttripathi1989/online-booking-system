import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { MessagesResolver } from './messages.resolver';
import { MessagesService } from './messages.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('MessagesResolver', () => {
  let resolver: MessagesResolver;
  let service: {
    threads: jest.Mock;
    messageableContacts: jest.Mock;
    thread: jest.Mock;
    sendMessage: jest.Mock;
    markThreadRead: jest.Mock;
    createThread: jest.Mock;
  };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      threads: jest.fn(),
      messageableContacts: jest.fn(),
      thread: jest.fn(),
      sendMessage: jest.fn(),
      markThreadRead: jest.fn(),
      createThread: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesResolver,
        { provide: MessagesService, useValue: service },
        { provide: PUB_SUB, useValue: { asyncIterableIterator: jest.fn() } },
      ],
    }).compile();
    resolver = module.get(MessagesResolver);
  });

  describe('role gating', () => {
    it('leaves every handler ungated — access control is thread-participation, not role (any authenticated user can message)', () => {
      const handlers = [
        MessagesResolver.prototype.threads,
        MessagesResolver.prototype.messageableContacts,
        MessagesResolver.prototype.thread,
        MessagesResolver.prototype.sendMessage,
        MessagesResolver.prototype.markThreadRead,
        MessagesResolver.prototype.createThread,
      ];
      for (const handler of handlers) {
        expect(reflector.get(ROLES_KEY, handler)).toBeUndefined();
      }
    });
  });

  describe('argument passthrough', () => {
    it('threads forwards the current user', async () => {
      const user = { sub: 'user-1' } as any;
      service.threads.mockResolvedValue([]);
      await resolver.threads(user);
      expect(service.threads).toHaveBeenCalledWith(user);
    });

    it('thread forwards id and user', async () => {
      const user = { sub: 'user-1' } as any;
      service.thread.mockResolvedValue({ id: 'thread-1' });
      await resolver.thread('thread-1', user);
      expect(service.thread).toHaveBeenCalledWith('thread-1', user);
    });

    it('sendMessage forwards threadId, body, and user', async () => {
      const user = { sub: 'user-1' } as any;
      service.sendMessage.mockResolvedValue({ id: 'thread-1' });
      await resolver.sendMessage('thread-1', 'hello', user);
      expect(service.sendMessage).toHaveBeenCalledWith('thread-1', 'hello', user);
    });

    it('createThread forwards input and user', async () => {
      const user = { sub: 'user-1' } as any;
      const input = { participant_ids: ['user-2'], first_message: 'hi' } as any;
      service.createThread.mockResolvedValue({ id: 'thread-1' });
      await resolver.createThread(input, user);
      expect(service.createThread).toHaveBeenCalledWith(input, user);
    });
  });
});
