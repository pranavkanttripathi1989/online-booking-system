import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ClinicianType, ClinicianPaginatedType } from './entities/clinician.entity';
import { CliniciansService } from './clinicians.service';
import { ClinicianInput } from './dto/clinician.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ClinicianType)
export class CliniciansResolver {
  constructor(private readonly cliniciansService: CliniciansService) {}

  @Query(() => ClinicianPaginatedType)
  clinicians(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('is_active', { type: () => Boolean, nullable: true }) isActive: boolean,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 }) first: number,
    @Args('page', { type: () => Int, nullable: true }) page: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cliniciansService.findAll(clinicId, isActive, first, page, user);
  }

  @Query(() => ClinicianType, { nullable: true })
  clinician(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.cliniciansService.findOne(id, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ClinicianType)
  createClinician(@Args('input') input: ClinicianInput) {
    return this.cliniciansService.create(input);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ClinicianType)
  updateClinician(@Args('id', { type: () => ID }) id: string, @Args('input') input: ClinicianInput, @CurrentUser() user: JwtPayload) {
    return this.cliniciansService.update(id, input, user);
  }
}
