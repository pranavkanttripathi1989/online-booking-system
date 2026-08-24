import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { CategoryPricingType, ChannelPricingType } from '../../services/entities/service.entity';

@ObjectType('ProductBranchOverrideProductSummary')
export class ProductBranchOverrideProductSummaryType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => Float, { nullable: true }) price?: number;
}

// REQ055 (US-ORG-05) — reuses CategoryPricingType/ChannelPricingType
// verbatim (REQ016), matching this codebase's convention of typed pricing
// output fields rather than a raw JSON scalar.
@ObjectType('ProductBranchOverride')
export class ProductBranchOverrideType {
  @Field(() => ID) id: string;
  @Field(() => ID) product_id: string;
  @Field(() => ID) clinic_id: string;
  @Field() mode: string;
  @Field(() => Float, { nullable: true }) override_price?: number;
  @Field(() => CategoryPricingType, { nullable: true }) override_category_pricing?: CategoryPricingType;
  @Field(() => ChannelPricingType, { nullable: true }) override_channel_pricing?: ChannelPricingType;
  @Field(() => ProductBranchOverrideProductSummaryType, { nullable: true }) product?: ProductBranchOverrideProductSummaryType;
}

@ObjectType('BranchOverrideUserError')
export class BranchOverrideUserErrorType {
  @Field() message: string;
}

@ObjectType('SetProductBranchOverrideResult')
export class SetProductBranchOverrideResultType {
  @Field() success: boolean;
  @Field(() => [BranchOverrideUserErrorType]) userErrors: BranchOverrideUserErrorType[];
  @Field(() => ProductBranchOverrideType, { nullable: true }) branchOverride?: ProductBranchOverrideType;
}
