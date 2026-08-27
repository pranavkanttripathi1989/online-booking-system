import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PublicService } from './public.service';
import {
  PublicClinicianType,
  PublicClinicianSummaryType,
  PublicProductType,
  PublicAppointmentSlotType,
  PublicAppointmentDetailType,
  BookedAppointmentResultType,
  PublicSlotHoldType,
} from './entities/public.entity';
import { PublicClinicianSearchInput, BookPatientAppointmentInput } from './dto/public.input';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class PublicResolver {
  constructor(private readonly publicService: PublicService) {}

  // Public/patient-self-serve surface — deliberately open, matching
  // public/landing.jsx and public/doctor-profile.jsx's zero-auth browsing
  // and booking flow (backend-api-requirements-master-plan.md Phase P8).
  @Public()
  @Query(() => [PublicClinicianSummaryType])
  getClinicians(@Args('search', { nullable: true }) search: PublicClinicianSearchInput) {
    return this.publicService.getClinicians(search);
  }

  @Public()
  @Query(() => PublicClinicianType)
  getClinician(@Args('id', { type: () => ID }) id: string) {
    return this.publicService.getClinician(id);
  }

  @Public()
  @Query(() => [PublicProductType])
  getProducts(@Args('clinicianId', { type: () => ID }) clinicianId: string) {
    return this.publicService.getProducts(clinicianId);
  }

  @Public()
  @Query(() => [PublicAppointmentSlotType])
  getAppointments(@Args('clinicianId', { type: () => ID }) clinicianId: string, @Args('date') date: string) {
    return this.publicService.getAppointments(clinicianId, date);
  }

  // video/index.jsx — behind login, deliberately not @Public().
  @Query(() => PublicAppointmentDetailType)
  getAppointment(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.publicService.getAppointment(id, user);
  }

  @Public()
  @Mutation(() => BookedAppointmentResultType)
  bookPatientAppointment(@Args('input') input: BookPatientAppointmentInput) {
    return this.publicService.bookPatientAppointment(input);
  }

  // P1-05 (BOOK-2) — deliberately @Public(), matching this whole dialect's
  // zero-auth browsing/booking flow (NAV-4): a slot must be holdable
  // before the wizard's own auth-at-confirmation step.
  @Public()
  @Mutation(() => PublicSlotHoldType)
  holdPublicSlot(@Args('clinicianId', { type: () => ID }) clinicianId: string, @Args('date') date: string, @Args('startTime') startTime: string) {
    return this.publicService.holdSlot(clinicianId, date, startTime);
  }

  @Public()
  @Mutation(() => Boolean)
  releasePublicSlot(
    @Args('clinicianId', { type: () => ID }) clinicianId: string,
    @Args('date') date: string,
    @Args('startTime') startTime: string,
    @Args('holdToken') holdToken: string,
  ) {
    return this.publicService.releaseSlot(clinicianId, date, startTime, holdToken);
  }

  // createPaymentTransaction removed (REQ004) -- it wrote appointment_id into
  // PaymentTransactions.metadata, a table scoped to tenant SaaS-subscription
  // billing with no appointment_id/patient_id columns at all. Replaced by
  // backend/src/appointment-payments' real Razorpay createRazorpayOrder/
  // verifyRazorpayPayment flow against the new AppointmentPayments model.
}
