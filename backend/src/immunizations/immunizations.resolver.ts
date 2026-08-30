import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ImmunizationsService } from './immunizations.service';
import { ImmunizationScheduleItemType, ImmunizationRecordType, ImmunizationStatusItemType } from './entities/immunization.entity';
import { RecordImmunizationInput } from './dto/record-immunization.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ImmunizationRecordType)
export class ImmunizationsResolver {
  constructor(private readonly immunizationsService: ImmunizationsService) {}

  // Platform-global reference data -- no @Auth() beyond authenticated,
  // matches test-results' own no-@Auth()-on-reads convention.
  @Query(() => [ImmunizationScheduleItemType])
  immunizationSchedule() {
    return this.immunizationsService.immunizationSchedule();
  }

  @Query(() => [ImmunizationRecordType])
  patientImmunizations(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.immunizationsService.patientImmunizations(patientId, user);
  }

  @Query(() => [ImmunizationStatusItemType])
  patientImmunizationStatus(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.immunizationsService.patientImmunizationStatus(patientId, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => ImmunizationRecordType)
  recordImmunization(@Args('input') input: RecordImmunizationInput, @CurrentUser() user: JwtPayload) {
    return this.immunizationsService.recordImmunization(input, user);
  }
}
