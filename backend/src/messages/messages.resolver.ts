import { Resolver, Query, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MessagesService, MESSAGE_RECEIVED_EVENT } from './messages.service';
import {
  MessageThreadType,
  MessageableContactType,
  CannedReplyType,
  CannedReplyMutationResultType,
  MessageAttachmentType,
} from './entities/message.entity';
import {
  CreateThreadInput,
  CreateCannedReplyInput,
  UpdateCannedReplyInput,
  CreateMessageAttachmentInput,
} from './dto/message.input';
import { Auth } from '../common/decorators/auth.decorator';
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

  @Query(() => [MessageableContactType])
  messageableContacts(@CurrentUser() user: JwtPayload) {
    return this.messagesService.messageableContacts(user);
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

  // REQ043 -- shared-inbox assignment; staff-facing action, not a patient one.
  @Auth('manager', 'admin', 'super_admin', 'staff', 'clinician')
  @Mutation(() => MessageThreadType)
  assignThread(
    @Args('threadId', { type: () => ID }) threadId: string,
    @Args('assigneeUserId', { type: () => ID }) assigneeUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagesService.assignThread(threadId, assigneeUserId, user);
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

  // REQ058 (US-MSG-01) — the "or Org Admin" oversight path; threads()
  // itself stays participant-only, unchanged.
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [MessageThreadType])
  departmentThreads(@Args('departmentId', { type: () => ID }) departmentId: string, @CurrentUser() user: JwtPayload) {
    return this.messagesService.departmentThreads(departmentId, user);
  }

  // REQ058 (US-MSG-03) — a staff productivity tool (quick-reply templates
  // for handling patient inquiries), not something a patient caller
  // should see or manage — unlike messageableContacts/threads, which are
  // deliberately open to every role.
  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [CannedReplyType])
  cannedReplies(@CurrentUser() user: JwtPayload) {
    return this.messagesService.cannedReplies(user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => CannedReplyMutationResultType)
  createCannedReply(@Args('input') input: CreateCannedReplyInput, @CurrentUser() user: JwtPayload) {
    return this.messagesService.createCannedReply(input, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => CannedReplyMutationResultType)
  updateCannedReply(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCannedReplyInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagesService.updateCannedReply(id, input, user);
  }

  @Auth('staff', 'clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => CannedReplyMutationResultType)
  deleteCannedReply(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.messagesService.deleteCannedReply(id, user);
  }

  // REQ058 (US-MSG-01) — the DB-row-creation half of message-attachments.
  // controller.ts's own upload.
  @Mutation(() => MessageAttachmentType)
  createMessageAttachment(@Args('input') input: CreateMessageAttachmentInput, @CurrentUser() user: JwtPayload) {
    return this.messagesService.createMessageAttachment(input, user);
  }
}
