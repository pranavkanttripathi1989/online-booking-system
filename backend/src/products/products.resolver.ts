import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import {
  ProductType,
  ProductCategoryType,
  ProductSubcategoryType,
  ProductMutationResultType,
  ProductCategoryMutationResultType,
  ProductSubcategoryMutationResultType,
  PriceHistoryType,
} from './entities/product.entity';
import {
  CreateProductInput,
  UpdateProductInput,
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
  CreateProductSubcategoryInput,
  UpdateProductSubcategoryInput,
} from './dto/product.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Query(() => [ProductType])
  products(
    @Args('clinic_id', { type: () => ID, nullable: true }) clinicId: string,
    @Args('category_id', { type: () => ID, nullable: true }) categoryId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.findAll(clinicId, categoryId, user);
  }

  @Query(() => ProductType, { nullable: true })
  product(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findOne(id, user);
  }

  // REQ016 (US-CAT-05) — same visibility as reading the product itself; no
  // extra role gate, matching product()'s own.
  @Query(() => [PriceHistoryType])
  priceHistory(@Args('product_id', { type: () => ID }) productId: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.priceHistory(productId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductMutationResultType)
  createProduct(@Args('input') input: CreateProductInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductMutationResultType)
  updateProduct(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateProductInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.update(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductMutationResultType)
  deleteProduct(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user);
  }

  @Query(() => [ProductCategoryType])
  productCategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.categories(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductCategoryMutationResultType)
  createProductCategory(@Args('input') input: CreateProductCategoryInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.createCategory(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductCategoryMutationResultType)
  updateProductCategory(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateProductCategoryInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.updateCategory(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductCategoryMutationResultType)
  deleteProductCategory(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.deleteCategory(id, user);
  }

  @Query(() => [ProductSubcategoryType])
  productSubcategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.subcategories(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  createProductSubcategory(@Args('input') input: CreateProductSubcategoryInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.createSubcategory(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  updateProductSubcategory(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateProductSubcategoryInput, @CurrentUser() user: JwtPayload) {
    return this.productsService.updateSubcategory(id, input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  deleteProductSubcategory(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.deleteSubcategory(id, user);
  }
}
