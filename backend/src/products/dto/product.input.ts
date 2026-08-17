import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min, IsIn } from 'class-validator';

// Matches manager/products/index.jsx's CreateProductInput/UpdateProductInput
// (the Categories tab is the only live consumer of the rich fields; the live
// manager/products/{create,edit}.jsx pages only ever send name/description/
// price/stock_quantity/sku/is_active — category_id/subcategory_id/product_type
// stay optional so both call sites work against the same DTO).
@InputType('CreateProductInput')
export class CreateProductInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsNotEmpty() sku: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field(() => Float, { nullable: true }) @IsOptional() @IsNumber() @Min(0) price?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() @Min(0) stock_quantity?: number;
  @Field({ nullable: true }) @IsOptional() category_id?: string;
  @Field({ nullable: true }) @IsOptional() subcategory_id?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(['simple', 'variable', 'service']) product_type?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('UpdateProductInput')
export class UpdateProductInput extends CreateProductInput {}

@InputType('CreateProductCategoryInput')
export class CreateProductCategoryInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
}

@InputType('UpdateProductCategoryInput')
export class UpdateProductCategoryInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
}

@InputType('CreateProductSubcategoryInput')
export class CreateProductSubcategoryInput {
  @Field() @IsNotEmpty() category_id: string;
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
}

@InputType('UpdateProductSubcategoryInput')
export class UpdateProductSubcategoryInput {
  @Field({ nullable: true }) @IsOptional() category_id?: string;
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
}
