import { Resolver, Query, Mutation, Subscription, Args, ID } from '@nestjs/graphql';
import { QueueService, QUEUE_UPDATED_EVENT } from './queue.service';
import { QueueBoardType, QueueEntryType, UnbilledVisitType } from './entities/queue.entity';
import { SkipQueueEntryInput, TransferQueueEntryInput } from './dto/queue.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Inject } from '@nestjs/common';
import { PUB_SUB } from '../common/pubsub.provider';
import { PubSub } from 'graphql-subscriptions';

// REQ019 (Phase 1, slice 4) P0. Same role set as appointments.resolver.ts's
// own journey mutations ('receptionist' kept alongside 'staff' to match
// this resolver's sibling decorators exactly, per CLAUDE.md's own note that
// the pairing is harmless as long as 'staff' is also present).
const QUEUE_STAFF_ROLES = ['manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist'] as const;

@Resolver(() => QueueEntryType)
export class QueueResolver {
  constructor(
    private readonly queueService: QueueService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Subscription(() => String, {
    filter: (payload, variables) => payload.queueUpdated === variables.clinic_id,
  })
  queueUpdated(@Args('clinic_id', { type: () => ID }) _clinicId: string) {
    return this.pubSub.asyncIterableIterator(QUEUE_UPDATED_EVENT);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Query(() => QueueBoardType)
  queueBoard(@Args('clinician_id', { type: () => ID }) clinicianId: string, @CurrentUser() user: JwtPayload) {
    return this.queueService.queueBoard(clinicianId, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Query(() => [QueueEntryType])
  queueEntries(@CurrentUser() user: JwtPayload) {
    return this.queueService.queueEntries(user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Query(() => [QueueEntryType])
  clinicQueue(@Args('clinic_id', { type: () => ID }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.queueService.clinicQueue(clinicId, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Query(() => [UnbilledVisitType])
  unbilledVisits(@Args('clinic_id', { type: () => ID }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.queueService.unbilledVisits(clinicId, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Mutation(() => QueueEntryType)
  callNextInQueue(@Args('clinician_id', { type: () => ID }) clinicianId: string, @CurrentUser() user: JwtPayload) {
    return this.queueService.callNext(clinicianId, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Mutation(() => QueueEntryType)
  recallQueueEntry(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.queueService.recall(id, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Mutation(() => QueueEntryType)
  skipQueueEntry(@Args('input') input: SkipQueueEntryInput, @CurrentUser() user: JwtPayload) {
    return this.queueService.skip(input, user);
  }

  @Auth(...QUEUE_STAFF_ROLES)
  @Mutation(() => QueueEntryType)
  transferQueueEntry(@Args('input') input: TransferQueueEntryInput, @CurrentUser() user: JwtPayload) {
    return this.queueService.transfer(input, user);
  }
}
