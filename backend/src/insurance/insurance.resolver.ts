import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { InsuranceService } from './insurance.service';
import { PayerType, PayerEmpanelmentType, PatientInsurancePolicyType } from './entities/insurance.entity';
import {
  PayerInput,
  PayerEmpanelmentInput,
  UpdatePayerEmpanelmentStatusInput,
  PatientInsurancePolicyInput,
} from './dto/insurance.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class InsuranceResolver {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [PayerType])
  payers(@Args('is_active', { type: () => Boolean, nullable: true }) isActive: boolean | undefined) {
    return this.insuranceService.findPayers(isActive);
  }

  @Auth('super_admin')
  @Mutation(() => PayerType)
  createPayer(@Args('input') input: PayerInput) {
    return this.insuranceService.createPayer(input);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [PayerEmpanelmentType])
  payerEmpanelments(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.findEmpanelments(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PayerEmpanelmentType)
  createPayerEmpanelment(@Args('input') input: PayerEmpanelmentInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.createEmpanelment(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PayerEmpanelmentType)
  updatePayerEmpanelmentStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdatePayerEmpanelmentStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.updateEmpanelmentStatus(id, input, user);
  }

  @Auth('patient', 'staff', 'manager', 'admin', 'super_admin')
  @Query(() => [PatientInsurancePolicyType])
  patientInsurancePolicies(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.findPolicies(patientId, user);
  }

  @Auth('patient', 'staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => PatientInsurancePolicyType)
  createPatientInsurancePolicy(@Args('input') input: PatientInsurancePolicyInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.createPolicy(input, user);
  }
}
