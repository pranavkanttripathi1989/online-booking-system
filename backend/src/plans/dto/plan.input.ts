import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsBoolean, IsIn, IsInt, Min, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// REQ032 (US-PLAN-01/02) — plan-builder data model only. Deliberately no
// entitlement-guard wiring in this slice (CLAUDE.md's own explicit
// caution: that integration is a separate, higher-risk future step).
export const PLAN_TIERS = ['starter', 'pro', 'enterprise'] as const;
export const BILLING_PERIODS = ['monthly', 'annual'] as const;

@InputType('FeatureFlagInput')
export class FeatureFlagInput {
  @Field() @IsNotEmpty() key: string;
  @Field() @IsBoolean() enabled: boolean;
}

@InputType('PlanQuotaInput')
export class PlanQuotaInput {
  @Field() @IsNotEmpty() key: string;
  @Field(() => Int) @IsInt() @Min(0) value: number;
}

// Creates a Plan (name/tier) plus its first PlanVersion in one call — a
// plan with zero versions has nothing to assign to a tenant, so the two
// are never meaningfully separate at creation time.
@InputType('PlanInput')
export class PlanInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsIn(PLAN_TIERS) tier: string;
  @Field() @IsIn(BILLING_PERIODS) billing_period: string;
  // Live-verification finding (2026-08-24): a field with zero
  // class-validator decorators is stripped by the global ValidationPipe's
  // whitelist:true, then rejected by forbidNonWhitelisted:true — the same
  // bug class REQ020 first found and pharmacy.input.ts's AdjustStockInput
  // repeated in this same pass. Every @Field in this file now has at
  // least one decorator.
  @Field(() => Float) @IsNumber() @Min(0) price: number; // rupees at the GraphQL boundary, paise at rest
  @Field(() => [FeatureFlagInput]) @IsArray() @ValidateNested({ each: true }) @Type(() => FeatureFlagInput) feature_flags: FeatureFlagInput[];
  @Field(() => [PlanQuotaInput]) @IsArray() @ValidateNested({ each: true }) @Type(() => PlanQuotaInput) quotas: PlanQuotaInput[];
}

// US-PLAN-02 — editing a live plan creates a NEW PlanVersion, never
// mutates the one existing subscribers may already be pinned to. This
// input carries only what a new version needs (no name/tier — those live
// on the parent Plan and aren't versioned).
@InputType('CreatePlanVersionInput')
export class CreatePlanVersionInput {
  @Field(() => ID) @IsNotEmpty() plan_id: string;
  @Field() @IsIn(BILLING_PERIODS) billing_period: string;
  @Field(() => Float) @IsNumber() @Min(0) price: number;
  @Field(() => [FeatureFlagInput]) @IsArray() @ValidateNested({ each: true }) @Type(() => FeatureFlagInput) feature_flags: FeatureFlagInput[];
  @Field(() => [PlanQuotaInput]) @IsArray() @ValidateNested({ each: true }) @Type(() => PlanQuotaInput) quotas: PlanQuotaInput[];
}
