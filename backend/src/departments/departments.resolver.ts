import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { DepartmentsService } from './departments.service';
import { DepartmentType, DepartmentMutationResultType } from './entities/department.entity';
import { DepartmentInput } from './dto/department.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => DepartmentType)
export class DepartmentsResolver {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Auth('manager', 'admin', 'super_admin', 'staff')
  @Query(() => [DepartmentType])
  departments(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.findAll(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'staff')
  @Query(() => DepartmentType, { nullable: true })
  department(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DepartmentType)
  createDepartment(@Args('input') input: DepartmentInput, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DepartmentType)
  updateDepartment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: DepartmentInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.departmentsService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DepartmentMutationResultType)
  deleteDepartment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.departmentsService.remove(id, user);
  }
}
