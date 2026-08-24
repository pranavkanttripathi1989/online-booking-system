import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsBoolean, IsIn, IsOptional } from 'class-validator';

// REQ034 — purpose-specific, individually withdrawable consent, per the
// requirement doc's own DPDP-grounded acceptance criteria (a single
// "I agree" checkbox cannot represent four legally distinct purposes).
export const CONSENT_PURPOSES = ['treatment', 'communications', 'marketing', 'record_sharing'] as const;
export const RIGHTS_REQUEST_TYPES = ['access', 'correction', 'erasure'] as const;
export const NOTICE_VERSION = 'v1';

@InputType('UpdateConsentInput')
export class UpdateConsentInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field() @IsIn(CONSENT_PURPOSES) purpose: string;
  @Field() @IsBoolean() granted: boolean;
}

// REQ034 — a request queued for admin review, never instant self-service
// deletion (see consent.service.ts's own comment on why: clinical records
// commonly carry a statutory retention floor that overrides an erasure
// request, so the code's job is capturing and SLA-tracking the request,
// not performing an automated purge).
@InputType('RequestDataRightsInput')
export class RequestDataRightsInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field() @IsIn(RIGHTS_REQUEST_TYPES) type: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}

@InputType('ResolveRightsRequestInput')
export class ResolveRightsRequestInput {
  @Field() @IsIn(['approved', 'rejected', 'completed']) status: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}
