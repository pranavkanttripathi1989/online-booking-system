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
} from './entities/appointment-payment.entity';
import { VerifyRazorpayPaymentInput, RecordCounterPaymentInput } from './dto/appointment-payment.input';
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
}
