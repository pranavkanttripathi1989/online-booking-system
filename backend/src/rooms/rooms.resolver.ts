import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { RoomsService } from './rooms.service';
import { RoomType, RoomPaginatedType, RoomMutationResultType } from './entities/room.entity';
import { RoomInput } from './dto/room.input';
import { SearchInput } from '../availability/dto/availability.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => RoomType)
export class RoomsResolver {
  constructor(private readonly roomsService: RoomsService) {}

  @Query(() => [RoomType])
  rooms(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findAll(clinicId, user);
  }

  @Query(() => RoomType, { nullable: true })
  room(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findOne(id, user);
  }

  // manager/rooms/index.jsx's real contract — paginated + free-text search,
  // a distinct query name from the bare-array `rooms` above so it does not
  // collide (context/frontend-integration-audit.md #20).
  @Query(() => RoomPaginatedType)
  roomsPaginated(@Args('search', { nullable: true }) search: SearchInput, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findAllPaginated(search?.search, search?.limit, search?.offset, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomType)
  createRoom(@Args('input') input: RoomInput, @CurrentUser() user: JwtPayload) {
    return this.roomsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomType)
  updateRoom(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: RoomInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RoomMutationResultType)
  deleteRoom(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.remove(id, user);
  }
}
