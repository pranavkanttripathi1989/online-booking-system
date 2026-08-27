import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationsResolver } from './organizations.resolver';
import { OrganizationsService } from './organizations.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('OrganizationsResolver', () => {
  let resolver: OrganizationsResolver;
  let service: { create: jest.Mock; update: jest.Mock; softDelete: jest.Mock; findAllPaginated: jest.Mock; getSubscription: jest.Mock; assignPlan: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findAllPaginated: jest.fn(),
      getSubscription: jest.fn(),
      assignPlan: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsResolver, { provide: OrganizationsService, useValue: service }],
    }).compile();
    resolver = module.get(OrganizationsResolver);
  });

  // Every handler is platform-admin only (TC-ADMIN-API-012) — deliberately
  // excludes 'manager', unlike Clinics/Rooms, since a tenant admin doesn't
  // create other tenants.
  describe('role gating (@Auth annotations)', () => {
    const cases: [string, (...args: unknown[]) => unknown][] = [
      ['organizationsPaginated', OrganizationsResolver.prototype.organizationsPaginated],
      ['organizationSubscription', OrganizationsResolver.prototype.organizationSubscription],
      ['assignOrgPlan', OrganizationsResolver.prototype.assignOrgPlan],
      ['createOrganization', OrganizationsResolver.prototype.createOrganization],
      ['updateOrganization', OrganizationsResolver.prototype.updateOrganization],
      ['deleteOrganization', OrganizationsResolver.prototype.deleteOrganization],
    ];

    it.each(cases)('%s is gated to exactly admin/super_admin', (_name, handler) => {
      const roles = reflector.get(ROLES_KEY, handler);
      expect(roles).toEqual(['admin', 'super_admin']);
    });
  });

  describe('organizationSubscription', () => {
    it('delegates to the service with the given orgId', async () => {
      service.getSubscription.mockResolvedValue({ id: 'sub-1', plan_name: 'Pro' });
      const result = await resolver.organizationSubscription('org-1');
      expect(service.getSubscription).toHaveBeenCalledWith('org-1');
      expect(result).toEqual({ id: 'sub-1', plan_name: 'Pro' });
    });

    it('returns null when the org has no subscription on file', async () => {
      service.getSubscription.mockResolvedValue(null);
      const result = await resolver.organizationSubscription('org-1');
      expect(result).toBeNull();
    });
  });

  // P1-04
  describe('assignOrgPlan', () => {
    it('assigns a plan and returns {success:true, organization}', async () => {
      service.assignPlan.mockResolvedValue({ id: 'org-1', plan_id: 'plan-1', plan_name: 'Pro' });
      const result = await resolver.assignOrgPlan('org-1', 'plan-1');
      expect(service.assignPlan).toHaveBeenCalledWith('org-1', 'plan-1');
      expect(result).toEqual({ success: true, userErrors: [], organization: { id: 'org-1', plan_id: 'plan-1', plan_name: 'Pro' } });
    });

    it('treats an omitted planId as null (clearing the assignment), not undefined', async () => {
      service.assignPlan.mockResolvedValue({ id: 'org-1', plan_id: null });
      await resolver.assignOrgPlan('org-1', undefined);
      expect(service.assignPlan).toHaveBeenCalledWith('org-1', null);
    });

    it('maps a NotFoundException (unknown org or plan) into {success:false}', async () => {
      service.assignPlan.mockRejectedValue(new NotFoundException('Plan not found'));
      const result = await resolver.assignOrgPlan('org-1', 'ghost-plan');
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Plan not found' }], organization: undefined });
    });
  });

  describe('createOrganization — toResult error mapping', () => {
    it('returns {success:true, organization} on success', async () => {
      service.create.mockResolvedValue({ id: 'org-1', name: 'X' });
      const result = await resolver.createOrganization({ name: 'X' } as any);
      expect(result).toEqual({ success: true, userErrors: [], organization: { id: 'org-1', name: 'X' } });
    });

    it('maps a ConflictException into {success:false, userErrors} instead of throwing', async () => {
      service.create.mockRejectedValue(new ConflictException('Organization code "x" is already in use'));
      const result = await resolver.createOrganization({ name: 'X' } as any);
      expect(result.success).toBe(false);
      expect(result.userErrors).toEqual([{ message: 'Organization code "x" is already in use' }]);
      expect(result.organization).toBeUndefined();
    });

    it('maps a multi-message BadRequestException (validation pipe) into multiple userErrors', async () => {
      service.create.mockRejectedValue(new BadRequestException(['name should not be empty', 'contactEmail must be an email']));
      const result = await resolver.createOrganization({} as any);
      expect(result.success).toBe(false);
      expect(result.userErrors).toEqual([
        { message: 'name should not be empty' },
        { message: 'contactEmail must be an email' },
      ]);
    });

    it('re-throws a non-HttpException error rather than swallowing it', async () => {
      service.create.mockRejectedValue(new Error('db connection lost'));
      await expect(resolver.createOrganization({} as any)).rejects.toThrow('db connection lost');
    });
  });

  describe('updateOrganization — toResult error mapping', () => {
    it('maps a NotFoundException into {success:false}', async () => {
      service.update.mockRejectedValue(new NotFoundException('Organization not found'));
      const result = await resolver.updateOrganization('missing-id', {} as any);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Organization not found' }], organization: undefined });
    });
  });

  describe('deleteOrganization', () => {
    it('returns {success:true} on successful soft-delete', async () => {
      service.softDelete.mockResolvedValue(true);
      const result = await resolver.deleteOrganization('org-1');
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    it('maps a NotFoundException into {success:false} rather than throwing', async () => {
      service.softDelete.mockRejectedValue(new NotFoundException('Organization not found'));
      const result = await resolver.deleteOrganization('missing-id');
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Organization not found' }] });
    });

    it('re-throws a non-HttpException error', async () => {
      service.softDelete.mockRejectedValue(new Error('db connection lost'));
      await expect(resolver.deleteOrganization('org-1')).rejects.toThrow('db connection lost');
    });
  });
});
