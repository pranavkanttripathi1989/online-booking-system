import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('ProductCategory')
export class ProductCategoryType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field() is_active: boolean;
}

@ObjectType('ProductSubcategory')
export class ProductSubcategoryType {
  @Field(() => ID) id: string;
  @Field(() => ID) category_id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field() is_active: boolean;
}

// Registered 'Product' — matches manager/products/index.jsx's real,
// live-rendered contract exactly (the list view + Categories tab; that
// page's own inline product create/edit form is unreachable dead code,
// confirmed via grep — setShowPForm(true) is never called anywhere). The
// actual live product create/edit UX is manager/products/{create,edit}.jsx,
// rewired to this same wrapper shape (context/frontend-integration-audit.md
// #17-19).
@ObjectType('Product')
export class ProductType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) clinic_id?: string;
  @Field(() => ID, { nullable: true }) category_id?: string;
  @Field(() => ID, { nullable: true }) subcategory_id?: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field() product_type: string;
  @Field() sku: string;
  @Field(() => Float, { nullable: true }) price?: number;
  @Field(() => Int, { nullable: true }) stock_quantity?: number;
  @Field() is_active: boolean;
  @Field(() => ProductCategoryType, { nullable: true }) category?: ProductCategoryType;
  @Field(() => ProductSubcategoryType, { nullable: true }) subcategory?: ProductSubcategoryType;
}

@ObjectType('ProductUserError')
export class ProductUserErrorType {
  @Field() message: string;
}

@ObjectType('ProductRef')
export class ProductRefType {
  @Field(() => ID) id: string;
}

@ObjectType('ProductMutationResult')
export class ProductMutationResultType {
  @Field() success: boolean;
  @Field(() => [ProductUserErrorType]) userErrors: ProductUserErrorType[];
  @Field(() => ProductRefType, { nullable: true }) product?: ProductRefType;
}

@ObjectType('ProductCategoryMutationResult')
export class ProductCategoryMutationResultType {
  @Field() success: boolean;
  @Field(() => [ProductUserErrorType]) userErrors: ProductUserErrorType[];
}

@ObjectType('ProductSubcategoryMutationResult')
export class ProductSubcategoryMutationResultType {
  @Field() success: boolean;
  @Field(() => [ProductUserErrorType]) userErrors: ProductUserErrorType[];
}
