import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { BlocksService } from './blocks.service';
import { SpacerBlockType, RoomBlockType, ClinicianSpacerBlockType, SpacerBlockMutationResultType, RoomBlockMutationResultType } from './entities/block.entity';
import { CreateSpacerBlockInput, CreateRoomBlockInput } from './dto/block.input';
import { SearchInput } from '../availability/dto/availability.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class BlocksResolver {
  constructor(private readonly blocksService: BlocksService) {}

  // BUG012: neither list query had @Auth() -- any authenticated role could
  // read every spacer/room block in their org. Both are only ever called by
  // manager/Blocks.jsx, itself gated to manager/admin/super_admin by App.jsx's
  // RoleGuard on /manager/blocks.
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [SpacerBlockType])
  spacerBlocks(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.spacerBlocks(search?.limit, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [RoomBlockType])
  roomBlocks(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.roomBlocks(search?.limit, user);
  }

  // BUG012: this had no @Auth() AND no scoping of any kind in the service --
  // any authenticated caller could pass an arbitrary clinicianId and read
  // that clinician's block schedule (reasons, times) across organizations.
  // clinician/Dashboard.jsx is a real self-service caller, so 'clinician' is
  // included alongside the manager/admin/super_admin the sibling list
  // queries use; the service now enforces the clinician can only ever fetch
  // their own id, matching availability.service.ts's assertClinicianAccess.
  @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Query(() => [ClinicianSpacerBlockType])
  getSpacerBlocks(@Args('clinicianId', { type: () => ID }) clinicianId: string, @Args('date') date: string, @CurrentUser() user: JwtPayload) {
    return this.blocksService.getSpacerBlocks(clinicianId, date, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => SpacerBlockMutationResultType)
  createSpacerBlock(@Args('input') input: CreateSpacerBlockInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.createSpacerBlock(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => SpacerBlockMutationResultType)
  updateSpacerBlock(@Args('id', { type: () => ID }) id: string, @Args('input') input: CreateSpacerBlockInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.updateSpacerBlock(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => SpacerBlockMutationResultType)
  deleteSpacerBlock(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.blocksService.deleteSpacerBlock(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomBlockMutationResultType)
  createRoomBlock(@Args('input') input: CreateRoomBlockInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.createRoomBlock(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomBlockMutationResultType)
  updateRoomBlock(@Args('id', { type: () => ID }) id: string, @Args('input') input: CreateRoomBlockInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.updateRoomBlock(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomBlockMutationResultType)
  deleteRoomBlock(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.blocksService.deleteRoomBlock(id, user);
  }
}
