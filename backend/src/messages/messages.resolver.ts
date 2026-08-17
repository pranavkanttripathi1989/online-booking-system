import { Resolver, Query, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MessagesService, MESSAGE_RECEIVED_EVENT } from './messages.service';
import { MessageThreadType } from './entities/message.entity';
import { CreateThreadInput } from './dto/message.input';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PUB_SUB } from '../common/pubsub.provider';

@Resolver(() => MessageThreadType)
export class MessagesResolver {
  constructor(
    private readonly messagesService: MessagesService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [MessageThreadType])
  threads(@CurrentUser() user: JwtPayload) {
    return this.messagesService.threads(user);
  }

  @Query(() => MessageThreadType)
  thread(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.messagesService.thread(id, user);
  }

  @Mutation(() => MessageThreadType)
  sendMessage(@Args('threadId', { type: () => ID }) threadId: string, @Args('body') body: string, @CurrentUser() user: JwtPayload) {
    return this.messagesService.sendMessage(threadId, body, user);
  }

  @Mutation(() => Boolean)
  markThreadRead(@Args('threadId', { type: () => ID }) threadId: string, @CurrentUser() user: JwtPayload) {
    return this.messagesService.markThreadRead(threadId, user);
  }

  @Mutation(() => MessageThreadType)
  createThread(@Args('input') input: CreateThreadInput, @CurrentUser() user: JwtPayload) {
    return this.messagesService.createThread(input, user);
  }

  // Directly replaces MockStore.subscribe's fake local pub-sub (not real-time
  // across browser tabs/sessions today) — same graphql-ws/Redis-ready PubSub
  // infra as appointmentUpdated (next-10-features-implementation-plan.md #10).
  @Subscription(() => MessageThreadType, {
    filter: (payload, variables) => payload.userId === variables.userId,
  })
  messageReceived(@Args('userId', { type: () => ID }) _userId: string) {
    return this.pubSub.asyncIterableIterator(MESSAGE_RECEIVED_EVENT);
  }
}
