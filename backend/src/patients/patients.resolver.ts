import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { PatientsService } from './patients.service';
import { PatientType, PatientPaginatedType, PatientAppointmentsPaginatedType } from './entities/patient.entity';
import { PatientInput } from './dto/patient.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => PatientType)
export class PatientsResolver {
  constructor(private readonly patientsService: PatientsService) {}

  @Query(() => PatientPaginatedType)
  patients(
    @Args('search', { nullable: true }) search: string,
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.findAll(search, first, page, user);
  }

  @Query(() => PatientType, { nullable: true })
  patient(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.patientsService.findOne(id, user);
  }

  @ResolveField(() => PatientAppointmentsPaginatedType)
  appointments(
    @Parent() patient: PatientType,
    @Args('first', { type: () => Int, defaultValue: 20 }) first: number,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
  ) {
    return this.patientsService.appointments(patient.id, first, page);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => PatientType)
  createPatient(@Args('input') input: PatientInput) {
    return this.patientsService.create(input);
  }

  // 'patient' added so a patient can edit their own profile
  // (pages/patient/Profile.jsx) -- safe because update() already calls
  // findOne() first, which throws NotFound for any id that isn't the
  // caller's own patient_id when the caller's role is 'patient'. No new
  // scoping logic needed, just the missing role on the gate.
  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist', 'patient')
  @Mutation(() => PatientType)
  updatePatient(@Args('id', { type: () => ID }) id: string, @Args('input') input: PatientInput, @CurrentUser() user: JwtPayload) {
    return this.patientsService.update(id, input, user);
  }
}
