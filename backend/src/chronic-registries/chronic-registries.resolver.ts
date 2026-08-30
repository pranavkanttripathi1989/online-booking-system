import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ChronicRegistriesService } from './chronic-registries.service';
import { ChronicRegistrySuggestionType, ChronicRegistryEnrollmentType } from './entities/chronic-registry.entity';
import { EnrollInRegistryInput, MarkRegistryReviewedInput, ResolveRegistryEnrollmentInput } from './dto/chronic-registry.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ChronicRegistryEnrollmentType)
export class ChronicRegistriesResolver {
  constructor(private readonly chronicRegistriesService: ChronicRegistriesService) {}

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [ChronicRegistrySuggestionType])
  chronicRegistrySuggestions(@Args('condition') condition: string, @CurrentUser() user: JwtPayload) {
    return this.chronicRegistriesService.chronicRegistrySuggestions(condition, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Query(() => [ChronicRegistryEnrollmentType])
  registryEnrollments(@Args('condition', { nullable: true }) condition: string, @CurrentUser() user: JwtPayload) {
    return this.chronicRegistriesService.registryEnrollments(condition, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => ChronicRegistryEnrollmentType)
  enrollInRegistry(@Args('input') input: EnrollInRegistryInput, @CurrentUser() user: JwtPayload) {
    return this.chronicRegistriesService.enrollInRegistry(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => ChronicRegistryEnrollmentType)
  markRegistryReviewed(@Args('input') input: MarkRegistryReviewedInput, @CurrentUser() user: JwtPayload) {
    return this.chronicRegistriesService.markRegistryReviewed(input, user);
  }

  @Auth('clinician', 'manager', 'admin', 'super_admin', 'staff')
  @Mutation(() => ChronicRegistryEnrollmentType)
  resolveRegistryEnrollment(@Args('input') input: ResolveRegistryEnrollmentInput, @CurrentUser() user: JwtPayload) {
    return this.chronicRegistriesService.resolveRegistryEnrollment(input, user);
  }
}
