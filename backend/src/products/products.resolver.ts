import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import {
  ProductType,
  ProductCategoryType,
  ProductSubcategoryType,
  ProductMutationResultType,
  ProductCategoryMutationResultType,
  ProductSubcategoryMutationResultType,
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

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductMutationResultType)
  createProduct(@Args('input') input: CreateProductInput) {
    return this.productsService.create(input);
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
  createProductCategory(@Args('input') input: CreateProductCategoryInput) {
    return this.productsService.createCategory(input);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductCategoryMutationResultType)
  updateProductCategory(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateProductCategoryInput) {
    return this.productsService.updateCategory(id, input);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductCategoryMutationResultType)
  deleteProductCategory(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.deleteCategory(id);
  }

  @Query(() => [ProductSubcategoryType])
  productSubcategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.subcategories(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  createProductSubcategory(@Args('input') input: CreateProductSubcategoryInput) {
    return this.productsService.createSubcategory(input);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  updateProductSubcategory(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateProductSubcategoryInput) {
    return this.productsService.updateSubcategory(id, input);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ProductSubcategoryMutationResultType)
  deleteProductSubcategory(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.deleteSubcategory(id);
  }
}
