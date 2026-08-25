import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { HttpException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsPaginatedType, OrganizationMutationResultType, OrganizationSubscriptionType } from './entities/organization.entity';
import { OrganizationInput, OrganizationSearchInput } from './dto/organization.input';
import { Auth } from '../common/decorators/auth.decorator';

// admin/Organizations.jsx expects {success, userErrors, organization} rather
// than a thrown GraphQL error for validation/conflict failures — this resolver
// catches known HttpExceptions (ConflictException, NotFoundException, the
// ValidationPipe's BadRequestException) and maps them into that shape rather
// than letting them surface as top-level GraphQL errors, matching the only
// real consumer's actual handling (`if (!res?.createOrganization?.success) throw ...`).
function toResult(fn: () => Promise<any>) {
  return fn()
    .then((organization) => ({ success: true, userErrors: [], organization }))
    .catch((err) => {
      if (err instanceof HttpException) {
        const response = err.getResponse();
        const message = typeof response === 'string' ? response : (response as any).message;
        const messages = Array.isArray(message) ? message : [message];
        return { success: false, userErrors: messages.map((m: string) => ({ message: m })), organization: undefined };
      }
      throw err;
    });
}

// Organization creation/management is platform-admin only (TC-ADMIN-API-012) —
// deliberately NOT 'manager', unlike Clinics/Rooms: a clinic manager runs one
// tenant, they don't create tenants.
@Resolver()
export class OrganizationsResolver {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Auth('admin', 'super_admin')
  @Query(() => OrganizationsPaginatedType)
  organizationsPaginated(@Args('search', { nullable: true }) search?: OrganizationSearchInput) {
    return this.organizationsService.findAllPaginated(search ?? {});
  }

  @Auth('admin', 'super_admin')
  @Query(() => OrganizationSubscriptionType, { nullable: true })
  organizationSubscription(@Args('orgId', { type: () => ID }) orgId: string) {
    return this.organizationsService.getSubscription(orgId);
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => OrganizationMutationResultType)
  createOrganization(@Args('input') input: OrganizationInput) {
    return toResult(() => this.organizationsService.create(input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => OrganizationMutationResultType)
  updateOrganization(@Args('id', { type: () => ID }) id: string, @Args('input') input: OrganizationInput) {
    return toResult(() => this.organizationsService.update(id, input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => OrganizationMutationResultType)
  async deleteOrganization(@Args('id', { type: () => ID }) id: string) {
    try {
      await this.organizationsService.softDelete(id);
      return { success: true, userErrors: [] };
    } catch (err) {
      if (err instanceof HttpException) {
        const response = err.getResponse();
        const message = typeof response === 'string' ? response : (response as any).message;
        return { success: false, userErrors: [{ message: Array.isArray(message) ? message[0] : message }] };
      }
      throw err;
    }
  }
}
