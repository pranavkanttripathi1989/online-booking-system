import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateOrgCommunicationSettingsInput,
  UpdateOrgBookingPoliciesInput,
  UpdateOrgSecuritySettingsInput,
  UpdateOrgBrandingInput,
  UpdateOrgClinicalHoursInput,
} from './dto/org-settings.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { contrastRatio, WCAG_AA_MIN_CONTRAST } from '../common/utils/contrast';

const PAISE_TO_RUPEES = (paise: number) => paise / 100;
const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);

const NOT_LINKED_ERROR = "Your account isn't linked to an organization";

@Injectable()
export class OrgSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private toCommunicationSettings(row: any) {
    return {
      email_from_name: row.email_from_name,
      email_from_address: row.email_from_address ?? undefined,
      email_reply_to: row.email_reply_to ?? undefined,
      email_include_branding: row.email_include_branding,
    };
  }

  private toBookingPolicies(row: any) {
    return {
      no_show_fee: PAISE_TO_RUPEES(row.no_show_fee_paise),
      slot_buffer_minutes: row.slot_buffer_minutes,
      max_reschedules_per_month: row.max_reschedules_per_month,
      data_retention_years: row.data_retention_years,
      no_show_grace_minutes: row.no_show_grace_minutes,
      no_show_prepayment_threshold: row.no_show_prepayment_threshold,
    };
  }

  private toBranding(row: any) {
    return {
      name: row.name,
      logo_url: row.logo_url ?? undefined,
      primary_color: row.primary_color,
      secondary_color: row.secondary_color,
    };
  }

  private toSecuritySettings(row: any) {
    return {
      mfa_required: row.mfa_required,
      session_timeout_minutes: row.session_timeout_minutes ?? undefined,
      audit_log_enabled: row.audit_log_enabled,
      patient_data_export_enabled: row.patient_data_export_enabled,
      ip_whitelist_enabled: row.ip_whitelist_enabled,
      ip_whitelist: row.ip_whitelist ?? undefined,
    };
  }

  async myCommunicationSettings(user: JwtPayload) {
    if (!user.client_org_id) return null;
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    if (!org || org.is_deleted) return null;
    return this.toCommunicationSettings(org);
  }

  async updateMyCommunicationSettings(input: UpdateOrgCommunicationSettingsInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: NOT_LINKED_ERROR }] };
    }
    try {
      const row = await this.prisma.clientOrganizations.update({
        where: { id: user.client_org_id },
        data: {
          email_from_name: input.email_from_name,
          email_from_address: input.email_from_address,
          email_reply_to: input.email_reply_to,
          email_include_branding: input.email_include_branding,
        },
      });
      return { success: true, userErrors: [], settings: this.toCommunicationSettings(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update communication settings' }] };
    }
  }

  // REQ024 (US-MSG-04).
  private toClinicalHours(row: any) {
    return {
      clinical_hours_start: row.clinical_hours_start ?? undefined,
      clinical_hours_end: row.clinical_hours_end ?? undefined,
      clinical_hours_auto_reply_message: row.clinical_hours_auto_reply_message ?? undefined,
    };
  }

  async myClinicalHours(user: JwtPayload) {
    if (!user.client_org_id) return null;
    const row = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    return row ? this.toClinicalHours(row) : null;
  }

  async updateMyClinicalHours(input: UpdateOrgClinicalHoursInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: NOT_LINKED_ERROR }] };
    }
    try {
      const row = await this.prisma.clientOrganizations.update({
        where: { id: user.client_org_id },
        data: {
          clinical_hours_start: input.clinical_hours_start,
          clinical_hours_end: input.clinical_hours_end,
          clinical_hours_auto_reply_message: input.clinical_hours_auto_reply_message,
        },
      });
      return { success: true, userErrors: [], settings: this.toClinicalHours(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update clinical hours' }] };
    }
  }

  async myBookingPolicies(user: JwtPayload) {
    if (!user.client_org_id) return null;
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    if (!org || org.is_deleted) return null;
    return this.toBookingPolicies(org);
  }

  async updateMyBookingPolicies(input: UpdateOrgBookingPoliciesInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: NOT_LINKED_ERROR }] };
    }
    try {
      const row = await this.prisma.clientOrganizations.update({
        where: { id: user.client_org_id },
        data: {
          no_show_fee_paise: input.no_show_fee != null ? RUPEES_TO_PAISE(input.no_show_fee) : undefined,
          slot_buffer_minutes: input.slot_buffer_minutes,
          max_reschedules_per_month: input.max_reschedules_per_month,
          data_retention_years: input.data_retention_years,
          no_show_grace_minutes: input.no_show_grace_minutes,
          no_show_prepayment_threshold: input.no_show_prepayment_threshold,
        },
      });
      return { success: true, userErrors: [], policies: this.toBookingPolicies(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update booking policies' }] };
    }
  }

  async mySecuritySettings(user: JwtPayload) {
    if (!user.client_org_id) return null;
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    if (!org || org.is_deleted) return null;
    return this.toSecuritySettings(org);
  }

  async updateMySecuritySettings(input: UpdateOrgSecuritySettingsInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: NOT_LINKED_ERROR }] };
    }
    try {
      const row = await this.prisma.clientOrganizations.update({
        where: { id: user.client_org_id },
        data: {
          mfa_required: input.mfa_required,
          session_timeout_minutes: input.session_timeout_minutes,
          audit_log_enabled: input.audit_log_enabled,
          patient_data_export_enabled: input.patient_data_export_enabled,
          ip_whitelist_enabled: input.ip_whitelist_enabled,
          ip_whitelist: input.ip_whitelist,
        },
      });
      return { success: true, userErrors: [], settings: this.toSecuritySettings(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update security settings' }] };
    }
  }

  async myBranding(user: JwtPayload) {
    if (!user.client_org_id) return null;
    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    if (!org || org.is_deleted) return null;
    return this.toBranding(org);
  }

  async updateMyBranding(input: UpdateOrgBrandingInput, user: JwtPayload) {
    if (!user.client_org_id) {
      return { success: false, userErrors: [{ message: NOT_LINKED_ERROR }] };
    }
    // REQ002 §3.4 — reject a color too light to keep the white chrome
    // text/icons rendered on top of it readable, rather than silently
    // persisting an inaccessible combination.
    const userErrors: { message: string }[] = [];
    for (const [field, label] of [
      ['primary_color', 'Primary color'],
      ['secondary_color', 'Secondary color'],
    ] as const) {
      const value = input[field];
      if (value == null) continue;
      const ratio = contrastRatio(value, '#FFFFFF');
      if (ratio < WCAG_AA_MIN_CONTRAST) {
        userErrors.push({
          message: `${label} ${value} is too light to keep white text readable (contrast ${ratio.toFixed(2)}:1, needs at least ${WCAG_AA_MIN_CONTRAST}:1). Choose a darker shade.`,
        });
      }
    }
    if (userErrors.length > 0) return { success: false, userErrors };

    try {
      const row = await this.prisma.clientOrganizations.update({
        where: { id: user.client_org_id },
        data: {
          logo_url: input.logo_url,
          primary_color: input.primary_color,
          secondary_color: input.secondary_color,
        },
      });
      return { success: true, userErrors: [], branding: this.toBranding(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update branding' }] };
    }
  }
}
