import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ChecklistService } from './checklist.service';
import {
  ChecklistItemType,
  ChecklistCompletionType,
  ChecklistItemMutationResultType,
} from './entities/checklist.entity';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from './dto/checklist.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Matches QUEUE_STAFF_ROLES from queue.resolver.ts -- the same front-desk/
// nursing/clinician roles that already act on a queue entry are the ones
// who mark a checklist item complete for a patient's visit.
const CHECKLIST_STAFF_ROLES = ['manager', 'admin', 'super_admin', 'clinician', 'staff'] as const;

@Resolver()
export class ChecklistResolver {
  constructor(private readonly checklistService: ChecklistService) {}

  // clinic_id is optional: omitted returns every item across every clinic
  // in the caller's own org (an admin overview); given, scopes to that one
  // clinic (optionally further narrowed by product_id).
  @Query(() => [ChecklistItemType], { name: 'checklistItems' })
  @Auth(...CHECKLIST_STAFF_ROLES)
  checklistItems(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('product_id', { type: () => ID, nullable: true }) productId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checklistService.list(clinicId, productId, user);
  }

  @Query(() => [ChecklistCompletionType], { name: 'checklistCompletions' })
  @Auth(...CHECKLIST_STAFF_ROLES)
  checklistCompletions(@Args('appointment_id', { type: () => ID }) appointmentId: string, @CurrentUser() user: JwtPayload) {
    return this.checklistService.completionsForAppointment(appointmentId, user);
  }

  @Mutation(() => ChecklistItemMutationResultType, { name: 'createChecklistItem' })
  @Auth('admin', 'super_admin', 'manager')
  createChecklistItem(@Args('input') input: CreateChecklistItemInput, @CurrentUser() user: JwtPayload) {
    return this.checklistService.create(input, user);
  }

  @Mutation(() => ChecklistItemMutationResultType, { name: 'updateChecklistItem' })
  @Auth('admin', 'super_admin', 'manager')
  updateChecklistItem(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateChecklistItemInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checklistService.update(id, input, user);
  }

  @Mutation(() => ChecklistItemMutationResultType, { name: 'deleteChecklistItem' })
  @Auth('admin', 'super_admin', 'manager')
  deleteChecklistItem(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.checklistService.remove(id, user);
  }

  @Mutation(() => ChecklistItemMutationResultType, { name: 'completeChecklistItem' })
  @Auth(...CHECKLIST_STAFF_ROLES)
  completeChecklistItem(
    @Args('checklist_item_id', { type: () => ID }) checklistItemId: string,
    @Args('appointment_id', { type: () => ID }) appointmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checklistService.completeItem(checklistItemId, appointmentId, user);
  }
}
