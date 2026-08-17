import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { StaffService } from './staff.service';
import { StaffType } from './entities/staff.entity';
import { CreateStaffInput, UpdateStaffInput } from './dto/staff.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => StaffType)
export class StaffResolver {
  constructor(private readonly staffService: StaffService) {}

  @Auth('admin', 'super_admin', 'manager')
  @Query(() => [StaffType])
  staff(
    @Args('search', { nullable: true }) search: string,
    @Args('department', { nullable: true }) department: string,
    @Args('status', { nullable: true }) status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.staffService.findAll(search, department, status, user);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Query(() => StaffType)
  staffMember(@Args('id', { type: () => ID }) id: string) {
    return this.staffService.findOne(id);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Mutation(() => StaffType)
  createStaff(@Args('input') input: CreateStaffInput, @CurrentUser() user: JwtPayload) {
    return this.staffService.create(input, user);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Mutation(() => StaffType)
  updateStaff(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateStaffInput) {
    return this.staffService.update(id, input);
  }

  @Auth('admin', 'super_admin', 'manager')
  @Mutation(() => StaffType)
  deactivateStaff(@Args('id', { type: () => ID }) id: string) {
    return this.staffService.deactivate(id);
  }
}
