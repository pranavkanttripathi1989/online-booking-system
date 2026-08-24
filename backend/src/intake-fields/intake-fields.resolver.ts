import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { IntakeFieldsService } from './intake-fields.service';
import { IntakeFieldConfigType, IntakeFieldConfigMutationResultType } from './entities/intake-field.entity';
import { CreateIntakeFieldInput, UpdateIntakeFieldInput } from './dto/intake-field.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class IntakeFieldsResolver {
  constructor(private readonly intakeFieldsService: IntakeFieldsService) {}

  @Query(() => [IntakeFieldConfigType], { name: 'intakeFieldConfigs' })
  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff')
  intakeFieldConfigs(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('product_id', { type: () => ID, nullable: true }) productId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.intakeFieldsService.list(clinicId, productId, user);
  }

  @Mutation(() => IntakeFieldConfigMutationResultType, { name: 'createIntakeFieldConfig' })
  @Auth('admin', 'super_admin', 'manager')
  createIntakeFieldConfig(@Args('input') input: CreateIntakeFieldInput, @CurrentUser() user: JwtPayload) {
    return this.intakeFieldsService.create(input, user);
  }

  @Mutation(() => IntakeFieldConfigMutationResultType, { name: 'updateIntakeFieldConfig' })
  @Auth('admin', 'super_admin', 'manager')
  updateIntakeFieldConfig(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateIntakeFieldInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.intakeFieldsService.update(id, input, user);
  }

  @Mutation(() => IntakeFieldConfigMutationResultType, { name: 'deleteIntakeFieldConfig' })
  @Auth('admin', 'super_admin', 'manager')
  deleteIntakeFieldConfig(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.intakeFieldsService.remove(id, user);
  }
}
