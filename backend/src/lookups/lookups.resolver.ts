import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { HttpException } from '@nestjs/common';
import { LookupsService } from './lookups.service';
import { ClinicianTypeType } from './entities/clinician-type.entity';
import { RoomTypeType } from './entities/room-type.entity';
import { LookupMutationResultType } from './entities/lookup-mutation-result.entity';
import {
  CreateRoomTypeInput,
  UpdateRoomTypeInput,
  CreateClinicianTypeInput,
  UpdateClinicianTypeInput,
} from './dto/lookup.input';
import { Auth } from '../common/decorators/auth.decorator';

// admin/RoomTypes.jsx and admin/ClinicianTypes.jsx (the only real consumers)
// expect {success, userErrors} on every mutation, never the entity — matched
// exactly per context/backend-hard-rules.md Rule 9. Same catch-and-wrap
// approach as organizations.resolver.ts's toResult().
function toResult(fn: () => Promise<unknown>) {
  return fn()
    .then(() => ({ success: true, userErrors: [] }))
    .catch((err) => {
      if (err instanceof HttpException) {
        const response = err.getResponse();
        const message = typeof response === 'string' ? response : (response as any).message;
        const messages = Array.isArray(message) ? message : [message];
        return { success: false, userErrors: messages.map((m: string) => ({ message: m })) };
      }
      throw err;
    });
}

@Resolver()
export class LookupsResolver {
  constructor(private readonly lookupsService: LookupsService) {}

  @Query(() => [ClinicianTypeType])
  clinicianTypes() {
    return this.lookupsService.findAll('clinicianTypeModel');
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  createClinicianType(@Args('input') input: CreateClinicianTypeInput) {
    return toResult(() => this.lookupsService.create('clinicianTypeModel', input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  updateClinicianType(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateClinicianTypeInput) {
    return toResult(() => this.lookupsService.update('clinicianTypeModel', id, input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  deleteClinicianType(@Args('id', { type: () => ID }) id: string) {
    return toResult(() => this.lookupsService.remove('clinicianTypeModel', id));
  }

  @Query(() => [RoomTypeType])
  roomTypes() {
    return this.lookupsService.findAll('roomTypeModel');
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  createRoomType(@Args('input') input: CreateRoomTypeInput) {
    return toResult(() => this.lookupsService.create('roomTypeModel', input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  updateRoomType(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateRoomTypeInput) {
    return toResult(() => this.lookupsService.update('roomTypeModel', id, input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  deleteRoomType(@Args('id', { type: () => ID }) id: string) {
    return toResult(() => this.lookupsService.remove('roomTypeModel', id));
  }
}
