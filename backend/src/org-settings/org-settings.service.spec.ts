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
    name: 'Test Org',
    is_deleted: false,
    email_from_name: 'HealthSync',
    email_from_address: null,
    email_reply_to: null,
    email_include_branding: true,
    no_show_fee_paise: 8500,
    slot_buffer_minutes: 10,
    max_reschedules_per_month: 3,
    data_retention_years: 7,
    no_show_grace_minutes: 30,
    no_show_prepayment_threshold: 3,
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

    // REQ052
    it('exposes no_show_grace_minutes and no_show_prepayment_threshold', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow({ no_show_grace_minutes: 45, no_show_prepayment_threshold: 2 }));
      const result = await service.myBookingPolicies(orgUser);
      expect(result?.no_show_grace_minutes).toBe(45);
      expect(result?.no_show_prepayment_threshold).toBe(2);
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

    // REQ052
    it('updates no_show_grace_minutes and no_show_prepayment_threshold', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ no_show_grace_minutes: 45, no_show_prepayment_threshold: 2 }));
      await service.updateMyBookingPolicies({ no_show_grace_minutes: 45, no_show_prepayment_threshold: 2 } as any, orgUser);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ no_show_grace_minutes: 45, no_show_prepayment_threshold: 2 }) }),
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

  // REQ012/PLAN021 — admin/Policies.jsx "Security & Privacy" tab
  describe('mySecuritySettings / updateMySecuritySettings', () => {
    it('returns null for a platform-wide caller with no org to scope to', async () => {
      expect(await service.mySecuritySettings(platformUser)).toBeNull();
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('scopes strictly to the caller\'s own org id', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow({
        mfa_required: true, session_timeout_minutes: 30, audit_log_enabled: true,
        patient_data_export_enabled: false, ip_whitelist_enabled: false, ip_whitelist: null,
      }));
      const result = await service.mySecuritySettings(orgUser);
      expect(prisma.clientOrganizations.findUnique).toHaveBeenCalledWith({ where: { id: 'org-a' } });
      expect(result).toEqual({
        mfa_required: true, session_timeout_minutes: 30, audit_log_enabled: true,
        patient_data_export_enabled: false, ip_whitelist_enabled: false, ip_whitelist: undefined,
      });
    });

    it('rejects an update for a platform-wide caller with a clear message', async () => {
      const result = await service.updateMySecuritySettings({ mfa_required: true } as any, platformUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/linked to an organization/i);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('updates only the caller\'s own org row', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ mfa_required: true }));
      const result = await service.updateMySecuritySettings({ mfa_required: true } as any, orgUser);
      expect(result.success).toBe(true);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-a' } }),
      );
    });

    it('an explicit null clears session_timeout_minutes (distinct from omitting it)', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ session_timeout_minutes: null }));
      await service.updateMySecuritySettings({ session_timeout_minutes: null } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.session_timeout_minutes).toBeNull();
    });

    it('omitting session_timeout_minutes leaves it untouched', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow());
      await service.updateMySecuritySettings({ mfa_required: true } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.session_timeout_minutes).toBeUndefined();
    });
  });

  // REQ002/PLAN022 — Settings -> Clinic -> Branding tab
  describe('myBranding / updateMyBranding', () => {
    it('returns null for a platform-wide caller with no org to scope to', async () => {
      expect(await service.myBranding(platformUser)).toBeNull();
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('scopes strictly to the caller\'s own org id and applies the platform-default colors', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(
        orgRow({ logo_url: null, primary_color: '#006D77', secondary_color: '#00858F' }),
      );
      const result = await service.myBranding(orgUser);
      expect(prisma.clientOrganizations.findUnique).toHaveBeenCalledWith({ where: { id: 'org-a' } });
      expect(result).toEqual({ name: 'Test Org', logo_url: undefined, primary_color: '#006D77', secondary_color: '#00858F' });
    });

    it('rejects an update for a platform-wide caller with a clear message', async () => {
      const result = await service.updateMyBranding({ primary_color: '#123456' } as any, platformUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/linked to an organization/i);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('updates only the caller\'s own org row for a color that passes contrast', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ primary_color: '#123456' }));
      const result = await service.updateMyBranding({ primary_color: '#123456' } as any, orgUser);
      expect(result.success).toBe(true);
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-a' } }),
      );
    });

    it('rejects a primary_color too light to keep white text readable, without writing', async () => {
      const result = await service.updateMyBranding({ primary_color: '#FFFF00' } as any, orgUser);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/Primary color #FFFF00 is too light/);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('rejects a too-light secondary_color independently of primary_color', async () => {
      const result = await service.updateMyBranding(
        { primary_color: '#123456', secondary_color: '#EEEEEE' } as any,
        orgUser,
      );
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/Secondary color #EEEEEE is too light/);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('an explicit null logo_url clears the logo', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ logo_url: null }));
      await service.updateMyBranding({ logo_url: null } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.logo_url).toBeNull();
    });

    it('omitting logo_url leaves it untouched', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow());
      await service.updateMyBranding({ primary_color: '#123456' } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.logo_url).toBeUndefined();
    });
  });

  // REQ024 (US-MSG-04) — org-configured clinical hours driving
  // messages.service.ts's own auto-responder.
  describe('myClinicalHours / updateMyClinicalHours', () => {
    it('returns null for a platform-wide caller with no org to scope to', async () => {
      expect(await service.myClinicalHours(platformUser)).toBeNull();
      expect(prisma.clientOrganizations.findUnique).not.toHaveBeenCalled();
    });

    it('scopes strictly to the caller\'s own org id', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow({ clinical_hours_start: '09:00', clinical_hours_end: '18:00', clinical_hours_auto_reply_message: 'Closed.' }));
      const result = await service.myClinicalHours(orgUser);
      expect(prisma.clientOrganizations.findUnique).toHaveBeenCalledWith({ where: { id: 'org-a' } });
      expect(result).toEqual({ clinical_hours_start: '09:00', clinical_hours_end: '18:00', clinical_hours_auto_reply_message: 'Closed.' });
    });

    it('returns undefined fields (not null) when clinical hours were never configured', async () => {
      prisma.clientOrganizations.findUnique.mockResolvedValue(orgRow({ clinical_hours_start: null, clinical_hours_end: null, clinical_hours_auto_reply_message: null }));
      const result = await service.myClinicalHours(orgUser);
      expect(result).toEqual({ clinical_hours_start: undefined, clinical_hours_end: undefined, clinical_hours_auto_reply_message: undefined });
    });

    it('rejects an org-less caller on update', async () => {
      const result = await service.updateMyClinicalHours({ clinical_hours_start: '09:00' } as any, platformUser);
      expect(result.success).toBe(false);
      expect(prisma.clientOrganizations.update).not.toHaveBeenCalled();
    });

    it('updates all three fields for the caller\'s own org', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ clinical_hours_start: '21:00', clinical_hours_end: '08:00', clinical_hours_auto_reply_message: 'We reopen at 8am.' }));
      const result = await service.updateMyClinicalHours(
        { clinical_hours_start: '21:00', clinical_hours_end: '08:00', clinical_hours_auto_reply_message: 'We reopen at 8am.' } as any,
        orgUser,
      );
      expect(prisma.clientOrganizations.update).toHaveBeenCalledWith({
        where: { id: 'org-a' },
        data: { clinical_hours_start: '21:00', clinical_hours_end: '08:00', clinical_hours_auto_reply_message: 'We reopen at 8am.' },
      });
      expect(result.success).toBe(true);
      expect(result.settings?.clinical_hours_start).toBe('21:00');
    });

    // The partial-update convention this codebase uses throughout: explicit
    // null clears a field, an omitted field leaves the stored value alone
    // (see CLAUDE.md's own quiet-hours "Clear" button bug for why this
    // distinction matters — silently dropped once already).
    it('an explicit null clears a field', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow({ clinical_hours_start: null }));
      await service.updateMyClinicalHours({ clinical_hours_start: null } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.clinical_hours_start).toBeNull();
    });

    it('omitting a field leaves it untouched', async () => {
      prisma.clientOrganizations.update.mockResolvedValue(orgRow());
      await service.updateMyClinicalHours({ clinical_hours_start: '09:00' } as any, orgUser);
      const call = prisma.clientOrganizations.update.mock.calls[0][0];
      expect(call.data.clinical_hours_end).toBeUndefined();
      expect(call.data.clinical_hours_auto_reply_message).toBeUndefined();
    });

    it('returns a failure result rather than throwing when the update fails', async () => {
      prisma.clientOrganizations.update.mockRejectedValue(new Error('db exploded'));
      const result = await service.updateMyClinicalHours({ clinical_hours_start: '09:00' } as any, orgUser);
      expect(result.success).toBe(false);
    });
  });
});
