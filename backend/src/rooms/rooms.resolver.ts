import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { RoomsService } from './rooms.service';
import { RoomType } from './entities/room.entity';
import { RoomInput } from './dto/room.input';
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
}
