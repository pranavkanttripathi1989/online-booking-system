import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { AppointmentPaymentsService } from './appointment-payments.service';
import {
  RazorpayOrderResultType,
  PaymentVerificationResultType,
  TransactionType,
  FinanceTransactionType,
  FinanceSummaryType,
} from './entities/appointment-payment.entity';
import { VerifyRazorpayPaymentInput } from './dto/appointment-payment.input';
import { Public } from '../common/decorators/public.decorator';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class AppointmentPaymentsResolver {
  constructor(private readonly appointmentPaymentsService: AppointmentPaymentsService) {}

  @Public()
  @Mutation(() => RazorpayOrderResultType)
  createRazorpayOrder(@Args('appointmentId', { type: () => ID }) appointmentId: string) {
    return this.appointmentPaymentsService.createRazorpayOrder(appointmentId);
  }

  @Public()
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
}
