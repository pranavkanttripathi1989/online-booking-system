import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('PackageItem')
export class PackageItemType {
  @Field(() => ID) id: string;
  @Field(() => ID) product_id: string;
}

@ObjectType('Package')
export class PackageType {
  @Field(() => ID) id: string;
  @Field(() => ID) clinic_id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Int) total_sittings: number;
  @Field(() => Float) price: number; // rupees, converted at the resolver boundary
  @Field(() => Int) validity_days: number;
  @Field() is_active: boolean;
  @Field(() => [PackageItemType]) items: PackageItemType[];
}

@ObjectType('PatientPackage')
export class PatientPackageType {
  @Field(() => ID) id: string;
  @Field(() => ID) package_id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => Int) sittings_total: number;
  @Field(() => Int) sittings_remaining: number;
  @Field(() => Float) purchase_amount: number; // rupees
  @Field() purchase_tender_type: string;
  @Field({ nullable: true }) purchase_reference?: string;
  @Field() purchased_at: Date;
  @Field() expires_at: Date;
  @Field() is_expired: boolean;
  @Field(() => PackageType, { nullable: true }) package?: PackageType;
}

@ObjectType('PackageUserError')
export class PackageUserErrorType {
  @Field() message: string;
}

@ObjectType('PackageMutationResult')
export class PackageMutationResultType {
  @Field() success: boolean;
  @Field(() => [PackageUserErrorType]) userErrors: PackageUserErrorType[];
  @Field(() => PackageType, { nullable: true }) pkg?: PackageType;
}

@ObjectType('PurchasePackageResult')
export class PurchasePackageResultType {
  @Field() success: boolean;
  @Field(() => [PackageUserErrorType]) userErrors: PackageUserErrorType[];
  @Field(() => PatientPackageType, { nullable: true }) patientPackage?: PatientPackageType;
}
