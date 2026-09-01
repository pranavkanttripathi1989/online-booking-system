import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// booking/index.jsx's PaymentForm — the client's public half of the order,
// safe to expose. razorpay_key_id is the PUBLIC key (key_id), never the
// secret. REQ175 widened this beyond Razorpay-only: `gateway`/
// `checkout_type` tell the frontend which of the three real checkout flows
// to use (razorpay_widget/redirect/form_post) — the razorpay_* fields stay
// exactly as they were (still always populated for the razorpay path, the
// overwhelming default) so this is an additive, not a breaking, change to
// this type.
@ObjectType('PaymentFormField')
export class PaymentFormFieldType {
  @Field() key: string;
  @Field() value: string;
}

@ObjectType('RazorpayOrderResult')
export class RazorpayOrderResultType {
  @Field() razorpay_order_id: string;
  @Field(() => Int) amount: number; // paise, matches what Razorpay's own order object uses
  @Field() currency: string;
  @Field({ nullable: true }) razorpay_key_id?: string;
  @Field() gateway: string;
  @Field() checkout_type: string; // razorpay_widget | redirect | form_post
  @Field({ nullable: true }) redirect_url?: string;
  @Field({ nullable: true }) form_post_url?: string;
  @Field(() => [PaymentFormFieldType], { nullable: true }) form_fields?: PaymentFormFieldType[];
}

@ObjectType('PaymentVerificationResult')
export class PaymentVerificationResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}

// REQ023 (US-BIL-01, scoped subset). REQ056 (US-BIL-03) added
// pending_approval_id -- set (payment_id/invoice_number left unset) when a
// discount exceeded the org's threshold and was queued instead of applied;
// the caller checks which of the two is populated.
@ObjectType('RecordCounterPaymentResult')
export class RecordCounterPaymentResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => ID, { nullable: true }) payment_id?: string;
  @Field({ nullable: true }) invoice_number?: string;
  @Field(() => ID, { nullable: true }) pending_approval_id?: string;
}

// REQ056 (US-BIL-03).
@ObjectType('DiscountApprovalRequest')
export class DiscountApprovalRequestType {
  @Field(() => ID) id: string;
  @Field(() => ID) appointment_id: string;
  @Field(() => ID) clinic_id: string;
  @Field() requested_by_user_id: string;
  @Field(() => Float) discount_amount: number; // rupees
  @Field() discount_reason: string;
  @Field(() => Float) expected_amount: number; // rupees
  @Field() status: string;
  @Field({ nullable: true }) approved_by_user_id?: string;
  @Field({ nullable: true }) decided_at?: Date;
  @Field() created_at: Date;
}

@ObjectType('DecideDiscountApprovalResult')
export class DecideDiscountApprovalResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => ID, { nullable: true }) payment_id?: string;
}

// REQ056 (US-BIL-04, scoped subset).
@ObjectType('TenderBreakdown')
export class TenderBreakdownType {
  @Field() tender_type: string;
  @Field(() => Float) expected: number; // rupees
  @Field(() => Float) counted: number; // rupees
  @Field(() => Float) variance: number; // rupees
}

@ObjectType('CashDrawerCloseout')
export class CashDrawerCloseoutType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field() closed_by_user_id: string;
  @Field() business_date: Date;
  @Field(() => [TenderBreakdownType]) breakdown: TenderBreakdownType[];
  @Field(() => Float) total_expected: number; // rupees
  @Field(() => Float) total_counted: number; // rupees
  @Field(() => Float) variance: number; // rupees
  @Field({ nullable: true }) notes?: string;
  @Field() created_at: Date;
}

@ObjectType('CloseCashDrawerResult')
export class CloseCashDrawerResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => CashDrawerCloseoutType, { nullable: true }) closeout?: CashDrawerCloseoutType;
}

// REQ054 (US-CAT-01) — matches this file's own established throw-based
// pattern (recordCounterPayment throws on failure rather than returning
// {success:false, userErrors}), not the other convention this codebase
// also uses elsewhere.
@ObjectType('RedeemPackageSittingResult')
export class RedeemPackageSittingResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => ID, { nullable: true }) payment_id?: string;
  @Field(() => Int, { nullable: true }) sittings_remaining?: number;
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
  // REQ047 (US-BIL-09) -- null for a payment that hasn't succeeded yet
  // (pending/failed rows never get one); always set once status is succeeded.
  @Field({ nullable: true }) invoice_number?: string;
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

// REQ176 -- appointments/detail.jsx's "Request Refund" action needs to know
// whether a real succeeded, not-already-refunded payment exists for this
// appointment before offering the button at all. A minimal row shape, not
// the full AppointmentPayments record (invoice/GST fields have no reader
// here yet).
@ObjectType('AppointmentPaymentSummary')
export class AppointmentPaymentSummaryType {
  @Field(() => ID) id: string;
  @Field() status: string; // pending | succeeded | failed
  @Field(() => Float) amount: number; // rupees
  @Field() refund_status: string; // none | requested | approved | rejected | processing | refunded | failed
  @Field() created_at: Date;
}

// REQ176 -- mirrors DiscountApprovalRequests' own read shape exactly,
// including returning raw user ids rather than a resolved display name
// (discountRequestToGraphQL's own established precedent — Users has no
// name fields of its own; those live on UserProfiles, a separate lookup
// the frontend already knows how to do for the identical discount-queue
// UI this mirrors).
@ObjectType('RefundRequest')
export class RefundRequestType {
  @Field(() => ID) id: string;
  @Field(() => ID) appointment_payment_id: string;
  // Float rupees at the resolver boundary, matching every other money
  // field on this file's entities (Hard Rule 9) — discountRequestToGraphQL's
  // own expected_amount/discount_amount fields just above do the identical
  // PAISE_TO_RUPEES conversion; this one is stored as raw paise internally
  // (RefundRequests.requested_amount) but must convert here too.
  @Field(() => Float) requested_amount: number;
  @Field() reason: string;
  @Field() status: string; // pending | approved | rejected
  @Field() created_at: Date;
  @Field({ nullable: true }) decided_at?: Date;
  @Field(() => ID) requested_by_user_id: string;
  @Field(() => ID, { nullable: true }) decided_by_user_id?: string;
}

@ObjectType('RefundRequestResult')
export class RefundRequestResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => ID, { nullable: true }) request_id?: string;
}
