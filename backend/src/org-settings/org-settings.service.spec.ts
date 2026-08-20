import { Test, TestingModule } from '@nestjs/testing';
import { OrgSettingsService } from './org-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OrgSettingsService', () => {
  let service: OrgSettingsService;
  let prisma: { clientOrganizations: { findUnique: jest.Mock; update: jest.Mock } };

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const orgRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'org-a',
    is_deleted: false,
    email_from_name: 'HealthSync',
    email_from_address: null,
    email_reply_to: null,
    email_include_branding: true,
    no_show_fee_paise: 8500,
    slot_buffer_minutes: 10,
    max_reschedules_per_month: 3,
    data_retention_years: 7,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = { clientOrganizations: { findUnique: jest.fn(), update: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrgSettingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrgSettingsService);
  });

  describe('myCommunicationSettings / myBookingPolicies — org-scoping', () => {
    it('returns null for a platform-wide caller with no org to scope to', async () => {
      expect(await service.myCommunicationSettings(platformUser)).toBeNull();
      expect(await service.myBookingPolicies(platformUser)).toBeNull();
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('scopes strictly to the caller\'s own org id, never a client-supplied one', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow());
      await service.myCommunicationSettings(orgUser);
      expect(prisma.clientOrganizations.findUnique).toHaveBeenCalledWith({ where: { id: 'org-a' } });
    });

    it('converts no_show_fee_paise to rupees at the resolver boundary', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow({ no_show_fee_paise: 8500 }));
      const result = await service.myBookingPolicies(orgUser);
      expect(result?.no_show_fee).toBe(85);
    });
  });

  describe('updateMyCommunicationSettings / updateMyBookingPolicies', () => {
    it('rejects a platform-wide caller with a clear message rather than a DB error', async () => {
      const result = await service.updateMyCommunicationSettings({ email_from_name: 'X' } as any, platformUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/linked to an organization/i);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('updates only the caller\'s own org row', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ email_from_name: 'New Name' }));
      const result = await service.updateMyCommunicationSettings({ email_from_name: 'New Name' } as any, orgUser);
      expect(result.success).toBe(true);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-a' } }),
      );
    });

    it('converts rupees back to paise when updating no_show_fee', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ no_show_fee_paise: 10000 }));
      await service.updateMyBookingPolicies({ no_show_fee: 100 } as any, orgUser);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ no_show_fee_paise: 10000 }) }),
      );
    });

    it('rejects the booking-policies update for a platform-wide caller too', async () => {
      const result = await service.updateMyBookingPolicies({ slot_buffer_minutes: 15 } as any, platformUser);
      expect(result.success).toBe(false);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('returns {success:false} instead of throwing on a DB error', async () => {
      prisma.clientOrganizations.update.mockRejectedValue(new Error('db exploded'));
      const result = await service.updateMyCommunicationSettings({ email_from_name: 'X' } as any, orgUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toBe('db exploded');
    });
  });
});
