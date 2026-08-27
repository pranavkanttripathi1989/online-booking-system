import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineSessionType, ConsentToRecordingResultType } from './entities/telemedicine.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class TelemedicineResolver {
  constructor(private readonly service: TelemedicineService) {}

  // Both the patient and the treating clinician join the same session --
  // self-scoping happens inside the service (reusing
  // EncountersService.encounter()), not via a role-only gate here.
  @Auth('patient', 'clinician', 'manager', 'admin', 'super_admin')
  @Mutation(() => TelemedicineSessionType)
  joinTelemedicineSession(@Args('encounter_id', { type: () => ID }) encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.service.joinSession(encounterId, user);
  }

  @Auth('clinician')
  @Mutation(() => ConsentToRecordingResultType)
  consentToTelemedicineRecording(@Args('encounter_id', { type: () => ID }) encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.service.consentToRecording(encounterId, user);
  }
}
