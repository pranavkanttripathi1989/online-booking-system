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

  @Query(() => [SpacerBlockType])
  spacerBlocks(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.spacerBlocks(search?.limit, user);
  }

  @Query(() => [RoomBlockType])
  roomBlocks(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.blocksService.roomBlocks(search?.limit, user);
  }

  @Query(() => [ClinicianSpacerBlockType])
  getSpacerBlocks(@Args('clinicianId', { type: () => ID }) clinicianId: string, @Args('date') date: string) {
    return this.blocksService.getSpacerBlocks(clinicianId, date);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => SpacerBlockMutationResultType)
  createSpacerBlock(@Args('input') input: CreateSpacerBlockInput) {
    return this.blocksService.createSpacerBlock(input);
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
  createRoomBlock(@Args('input') input: CreateRoomBlockInput) {
    return this.blocksService.createRoomBlock(input);
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
