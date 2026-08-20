import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// booking/index.jsx's PaymentForm — the client's public half of the Razorpay
// order, safe to expose. razorpay_key_id is the PUBLIC key (key_id), never
// the secret — the frontend needs it to open the Razorpay Checkout widget.
@ObjectType('RazorpayOrderResult')
export class RazorpayOrderResultType {
  @Field() razorpay_order_id: string;
  @Field(() => Int) amount: number; // paise, matches what Razorpay's own order object uses
  @Field() currency: string;
  @Field() razorpay_key_id: string;
}

@ObjectType('PaymentVerificationResult')
export class PaymentVerificationResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}

// manager/Dashboard.jsx's GET_MANAGER_TRANSACTIONS query — field names are a
// hard contract (camelCase, matching the public/patient-self-serve dialect
// even though the rest of that page is canonical/snake_case — this specific
// field was already written this way in already-live frontend code before
// this resolver existed; matched exactly, not "fixed").
@ObjectType('TransactionClinician')
export class TransactionClinicianType {
  @Field() name: string;
}

@ObjectType('TransactionPatient')
export class TransactionPatientType {
  @Field(() => ID) id: string;
  @Field() firstName: string;
  @Field() lastName: string;
}

@ObjectType('TransactionProduct')
export class TransactionProductType {
  @Field() name: string;
}

@ObjectType('TransactionAppointment')
export class TransactionAppointmentType {
  @Field(() => ID) id: string;
  @Field(() => TransactionClinicianType) clinician: TransactionClinicianType;
  @Field(() => TransactionPatientType) patient: TransactionPatientType;
  @Field(() => TransactionProductType, { nullable: true }) product?: TransactionProductType;
}

@ObjectType('Transaction')
export class TransactionType {
  @Field(() => ID) id: string;
  @Field() createdAt: Date;
  @Field(() => Float) amount: number; // rupees at the GraphQL boundary — CLAUDE.md money rule
  @Field() status: string;
  @Field(() => TransactionAppointmentType) appointment: TransactionAppointmentType;
}

// finances/index.jsx — canonical (snake_case) dialect, no pre-existing
// contract to match (unlike Transaction above). Income only; see
// context/open-questions.md for the still-open expense-tracking question.
@ObjectType('FinanceTransaction')
export class FinanceTransactionType {
  @Field(() => ID) id: string;
  @Field() created_at: Date;
  @Field(() => Float) amount: number;
  @Field() status: string;
  @Field() patient_name: string;
  @Field({ nullable: true }) product_name?: string;
  @Field() method: string;
}

@ObjectType('FinanceMonthlyPoint')
export class FinanceMonthlyPointType {
  @Field() month: string;
  @Field(() => Float) revenue: number;
}

// Deliberately a distinct metric from analytics' "revenue" (billable
// appointment value) — this is real captured Razorpay payments. See
// appointment-payments.service.ts's myFinanceSummary comment.
@ObjectType('FinanceSummary')
export class FinanceSummaryType {
  @Field(() => Float) revenue_this_month: number;
  @Field(() => Int) pending_count: number;
  @Field(() => Float) pending_amount: number;
  @Field(() => Int) succeeded_count: number;
  @Field(() => Int) failed_count: number;
  @Field(() => [FinanceMonthlyPointType]) monthly: FinanceMonthlyPointType[];
}
