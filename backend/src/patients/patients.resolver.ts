import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { PatientsService } from './patients.service';
import {
  PatientType, PatientPaginatedType, PatientAppointmentsPaginatedType,
  DependantType, PotentialDuplicatePatientType,
} from './entities/patient.entity';
import { PatientInput, AddDependantInput, MergePatientsInput } from './dto/patient.input';
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
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.appointments(patient.id, first, page, user);
  }

  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Mutation(() => PatientType)
  createPatient(@Args('input') input: PatientInput, @CurrentUser() user: JwtPayload) {
    return this.patientsService.create(input, user);
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

  // REQ018 US-BOOK-01 -- same role set as createPatient; this is the
  // dedup-suggestion check that runs before it, not a separately-gated
  // capability.
  @Auth('manager', 'admin', 'super_admin', 'clinician', 'staff', 'receptionist')
  @Query(() => [PotentialDuplicatePatientType])
  potentialDuplicatePatients(
    @Args('phone') phone: string,
    @Args('first_name', { nullable: true }) firstName: string,
    @Args('last_name', { nullable: true }) lastName: string,
    @Args('date_of_birth', { nullable: true }) dateOfBirth: string,
  ) {
    return this.patientsService.findPotentialDuplicates(phone, firstName, lastName, dateOfBirth);
  }

  // REQ018 US-BOOK-01 -- deliberately NOT staff/receptionist (the
  // requirement's own non-functional note: merge is irreversible-in-the-UI
  // and touches clinical records, so it isn't a front-desk-default action).
  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PatientType)
  mergePatients(@Args('input') input: MergePatientsInput, @CurrentUser() user: JwtPayload) {
    return this.patientsService.mergePatients(input, user);
  }

  // REQ018 US-BOOK-02.
  @Auth('patient')
  @Query(() => [DependantType])
  myDependants(@CurrentUser() user: JwtPayload) {
    return this.patientsService.myDependants(user);
  }

  @Auth('patient')
  @Mutation(() => DependantType)
  addDependant(@Args('input') input: AddDependantInput, @CurrentUser() user: JwtPayload) {
    return this.patientsService.addDependant(input, user);
  }
}
