import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateOrgCommunicationSettingsInput,
  UpdateOrgBookingPoliciesInput,
  UpdateOrgSecuritySettingsInput,
} from './dto/org-settings.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

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
}
