import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { AppointmentPaymentsService } from './appointment-payments.service';
import {
  RazorpayOrderResultType,
  PaymentVerificationResultType,
  TransactionType,
  FinanceTransactionType,
  FinanceSummaryType,
  RecordCounterPaymentResultType,
  RedeemPackageSittingResultType,
  DiscountApprovalRequestType,
  DecideDiscountApprovalResultType,
  CashDrawerCloseoutType,
  CloseCashDrawerResultType,
  RefundRequestType,
  RefundRequestResultType,
  AppointmentPaymentSummaryType,
} from './entities/appointment-payment.entity';
import {
  VerifyRazorpayPaymentInput,
  RecordCounterPaymentInput,
  RedeemPackageSittingInput,
  DecideDiscountApprovalInput,
  CloseCashDrawerInput,
  RequestRefundInput,
  DecideRefundRequestInput,
} from './dto/appointment-payment.input';
import { Public } from '../common/decorators/public.decorator';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class AppointmentPaymentsResolver {
  constructor(private readonly appointmentPaymentsService: AppointmentPaymentsService) {}

  // REQ040/F-07 -- @Public() stays: booking/index.jsx (the anonymous public
  // booking wizard, BUG011) calls this before the visitor has authenticated,
  // so requiring auth would break that already-fixed flow. The real abuse
  // surface (anyone who learns an appointment UUID can mint unbounded real
  // Razorpay orders) is a rate problem given that architecture, not an
  // identity problem -- throttled instead, matching REQ038's "cost-bearing
  // send" tier (requestOtp/forgotPassword got the same 10/60s).
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Mutation(() => RazorpayOrderResultType)
  createRazorpayOrder(@Args('appointmentId', { type: () => ID }) appointmentId: string) {
    return this.appointmentPaymentsService.createRazorpayOrder(appointmentId);
  }

  // @Public() stays for the same reason -- the checkout callback genuinely
  // cannot carry a session token in the anonymous-booking flow.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Mutation(() => PaymentVerificationResultType)
  verifyRazorpayPayment(@Args('input') input: VerifyRazorpayPaymentInput) {
    return this.appointmentPaymentsService.verifyRazorpayPayment(input);
  }

  // manager/Dashboard.jsx's GET_MANAGER_TRANSACTIONS
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [TransactionType])
  getTransactionsByDate(
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @Args('limit', { type: () => Int, nullable: true }) limit: number | null,
    @Args('offset', { type: () => Int, nullable: true }) offset: number | null,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentPaymentsService.getTransactionsByDate(startDate, endDate, limit ?? 10, offset ?? 0, user);
  }

  // finances/index.jsx
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [FinanceTransactionType])
  myFinanceTransactions(
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentPaymentsService.myFinanceTransactions(startDate, endDate, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => FinanceSummaryType)
  myFinanceSummary(
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentPaymentsService.myFinanceSummary(startDate, endDate, user);
  }

  // REQ023 (US-BIL-01, scoped subset) — front-desk operation, not @Public()
  // (see the service method's own comment on why this differs from
  // createRazorpayOrder).
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => RecordCounterPaymentResultType)
  recordCounterPayment(@Args('input') input: RecordCounterPaymentInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.recordCounterPayment(input, user);
  }

  // REQ054 (US-CAT-01)
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => RedeemPackageSittingResultType)
  redeemPackageSitting(@Args('input') input: RedeemPackageSittingInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.redeemPackageSitting(input, user);
  }

  // REQ056 (US-BIL-03) — oversight query, manager+ only (matching
  // cancellation-rules' own role set for a policy-adjacent domain).
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [DiscountApprovalRequestType])
  discountApprovalRequests(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentPaymentsService.discountApprovalRequests(clinicId, user);
  }

  // REQ056 (US-BIL-03) — deliberately NOT the same @Auth() set as
  // recordCounterPayment (which includes 'staff'): the requester's own
  // service-layer check that they can't approve their own request only has
  // teeth because the gate here already excludes them from a role that
  // could self-serve past it.
  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => DecideDiscountApprovalResultType)
  decideDiscountApproval(@Args('input') input: DecideDiscountApprovalInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.decideDiscountApproval(input, user);
  }

  // REQ176 -- appointments/detail.jsx's own gate for whether to offer the
  // "Request Refund" button at all -- same role set as requestRefund below.
  @Auth('staff', 'manager', 'admin', 'super_admin', 'clinician')
  @Query(() => [AppointmentPaymentSummaryType])
  appointmentPayments(@Args('appointment_id', { type: () => ID }) appointmentId: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.paymentsForAppointment(appointmentId, user);
  }

  // REQ176 -- computes the refund amount entirely server-side via the
  // cancellation-fee policy engine; staff/clinician can request, matching
  // who already handles cancellations/counter payments day to day.
  @Auth('staff', 'manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => RefundRequestResultType)
  requestRefund(@Args('input') input: RequestRefundInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.requestRefund(input, user);
  }

  // Nullable clinic_id, matching discountApprovalRequests' own dual-mode
  // shape above (an omitted clinic_id scopes the caller's whole org).
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [RefundRequestType])
  clinicRefundRequests(@Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.myClinicRefundRequests(clinicId, user);
  }

  // REQ176 -- deliberately NOT the same @Auth() set as requestRefund, same
  // reasoning as decideDiscountApproval's own comment above: the
  // requester's own service-layer "can't approve your own request" check
  // only has teeth because this gate already excludes the requester's role
  // from a path that could self-serve past it.
  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => RefundRequestResultType)
  decideRefundRequest(@Args('input') input: DecideRefundRequestInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.decideRefundRequest(input, user);
  }

  // REQ056 (US-BIL-04, scoped subset) — any front-desk staff can close
  // their own clinic's drawer.
  @Auth('staff', 'manager', 'admin', 'super_admin')
  @Mutation(() => CloseCashDrawerResultType)
  closeCashDrawer(@Args('input') input: CloseCashDrawerInput, @CurrentUser() user: JwtPayload) {
    return this.appointmentPaymentsService.closeCashDrawer(input, user);
  }

  // Oversight query, manager+ only.
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [CashDrawerCloseoutType])
  cashDrawerCloseouts(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.appointmentPaymentsService.cashDrawerCloseouts(clinicId, user);
  }
}
