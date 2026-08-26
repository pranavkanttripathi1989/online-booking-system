import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { InsuranceService } from './insurance.service';
import { PayerType, PayerEmpanelmentType, PatientInsurancePolicyType, PayerTariffType, PayerChargeEstimateType, ClaimType } from './entities/insurance.entity';
import {
  PayerInput,
  PayerEmpanelmentInput,
  UpdatePayerEmpanelmentStatusInput,
  PatientInsurancePolicyInput,
  PayerTariffInput,
  SubmitClaimInput,
  UpdateClaimStatusInput,
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

  // REQ031 (US-INS-02) — master data only, not wired into billing yet.
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [PayerTariffType])
  payerTariffs(
    @Args('payer_id', { type: () => ID, nullable: true }) payerId: string | undefined,
    @Args('product_id', { type: () => ID, nullable: true }) productId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.findTariffs(payerId, productId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PayerTariffType)
  setPayerTariff(@Args('input') input: PayerTariffInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.setPayerTariff(input, user);
  }

  // REQ100 — matches payerTariffs' own gate (front-desk/staff need this for
  // quoting, not just admin/manager).
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => PayerChargeEstimateType)
  estimatedPayerCharge(
    @Args('productId', { type: () => ID }) productId: string,
    @Args('payerId', { type: () => ID }) payerId: string,
    @Args('patientId', { type: () => ID, nullable: true }) patientId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.estimatedPayerCharge(productId, payerId, patientId, user);
  }

  // REQ131 (REQ031's own P2 follow-on) — same @Auth gate as payers/
  // payerTariffs/estimatedPayerCharge above (front-desk/insurance-desk
  // data entry).
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => ClaimType)
  submitClaim(@Args('input') input: SubmitClaimInput, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.submitClaim(input, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => [ClaimType])
  claims(@Args('status', { type: () => String, nullable: true }) status: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.claims(status, user);
  }

  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Query(() => ClaimType, { nullable: true })
  claim(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.insuranceService.claim(id, user);
  }

  // Deciding a claim's outcome is a higher-trust action than submitting
  // one — same asymmetry as updatePayerEmpanelmentStatus above (manager+
  // only, not staff).
  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ClaimType)
  updateClaimStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateClaimStatusInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.insuranceService.updateClaimStatus(id, input, user);
  }
}
