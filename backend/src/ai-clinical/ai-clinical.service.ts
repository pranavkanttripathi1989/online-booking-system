import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EncountersService } from '../encounters/encounters.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { isPlatformOperator } from '../common/scoping/tenant-scope';
import { encryptJson, decryptJson } from '../common/crypto/secrets';
import { getTranscriptionProvider, listTranscriptionProviders } from './providers/registry';
import { validateCredentials } from './providers/provider.interface';
import { structureTranscript, extractVitals } from './transcript-structuring';
import { extractPrescriptionDraft as extractPrescriptionDraftFromTranscript } from './prescription-extraction';
import { suggestCodes } from './coding-suggestion';
import { buildPreConsultSummary } from './pre-consult-summary';
import { StartTranscriptionSessionInput, SubmitTranscriptionInput, UpdateAiProviderConfigInput } from './dto/ai-clinical.input';

const NOT_LINKED_ERROR = "Your account isn't linked to an organization";
// FR-AI-11's own quota key, resolved the same way clinicians.service.ts's
// max_clinician_seats already is — a plan's own quotas_json names this
// exact key when it wants to constrain it; an ungated org (no plan, or a
// plan that doesn't mention this key) has no limit, the same fail-open
// default every other quota in this codebase already uses.
const QUOTA_KEY = 'ai_transcription_minutes_per_month';
// Exported so the resolver's @RequiresFeature() decorator uses this exact
// literal rather than a second, driftable copy of the same string.
export const AI_SCRIBE_FEATURE_KEY = 'ai_scribe';

@Injectable()
export class AiClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encountersService: EncountersService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  // ── Provider config (FR-AI-12) ─────────────────────────────────────────
  // Same shape/precedent as NotificationProviderConfigService, one purpose
  // ('transcription') per org today.

  providers() {
    return listTranscriptionProviders();
  }

  async myProviderConfig(user: JwtPayload) {
    if (!user.client_org_id) return { provider: undefined, has_credentials: false };
    const row = await this.prisma.aiProviderConfig.findUnique({
      where: { client_org_id_purpose: { client_org_id: user.client_org_id, purpose: 'transcription' } },
    });
    if (!row) return { provider: undefined, has_credentials: false };
    return { provider: row.provider, has_credentials: true };
  }

  async updateMyProviderConfig(input: UpdateAiProviderConfigInput, user: JwtPayload) {
    if (!user.client_org_id) return { success: false, message: NOT_LINKED_ERROR };
    const provider = getTranscriptionProvider(input.provider);
    if (!provider) return { success: false, message: `Unknown provider "${input.provider}"` };

    const credentials: Record<string, string> = {};
    for (const f of input.credentials) credentials[f.key] = f.value;

    const hasNewCredentials = Object.values(credentials).some((v) => v && v.length > 0);
    let credentialsEncrypted: string;
    if (hasNewCredentials) {
      const validationError = validateCredentials(provider, credentials);
      if (validationError) return { success: false, message: validationError };
      credentialsEncrypted = encryptJson(credentials);
    } else {
      const existing = await this.prisma.aiProviderConfig.findUnique({
        where: { client_org_id_purpose: { client_org_id: user.client_org_id, purpose: 'transcription' } },
      });
      if (!existing) return { success: false, message: 'Credentials are required for a new provider configuration' };
      credentialsEncrypted = existing.credentials_encrypted;
    }

    await this.prisma.aiProviderConfig.upsert({
      where: { client_org_id_purpose: { client_org_id: user.client_org_id, purpose: 'transcription' } },
      create: { client_org_id: user.client_org_id, purpose: 'transcription', provider: input.provider, credentials_encrypted: credentialsEncrypted },
      update: { provider: input.provider, credentials_encrypted: credentialsEncrypted },
    });
    return { success: true };
  }

  // ── Usage metering (FR-AI-11) ───────────────────────────────────────────

  private async minutesUsedThisMonth(orgId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const result = await this.prisma.aiTranscriptionSessions.aggregate({
      where: { client_org_id: orgId, created_at: { gte: startOfMonth }, status: { not: 'failed' } },
      _sum: { duration_seconds: true },
    });
    return Math.ceil((result._sum.duration_seconds ?? 0) / 60);
  }

  async myUsage(user: JwtPayload) {
    if (!user.client_org_id) return { minutes_used_this_month: 0, minutes_quota: undefined };
    const [minutesUsed, quota] = await Promise.all([
      this.minutesUsedThisMonth(user.client_org_id),
      this.entitlementsService.getQuota(user.client_org_id, QUOTA_KEY),
    ]);
    return { minutes_used_this_month: minutesUsed, minutes_quota: quota ?? undefined };
  }

  // ── Transcription session lifecycle ─────────────────────────────────────

  // FR-AI-01 — this is the logged proof consent was given: the row (and
  // therefore the whole session) simply does not exist without it.
  async startTranscriptionSession(input: StartTranscriptionSessionInput, user: JwtPayload) {
    if (!input.consent_given) {
      throw new BadRequestException('Recording requires the patient\'s explicit consent');
    }
    const encounter = await this.encountersService.encounter(input.encounter_id, user);
    if ((encounter as any).locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited');
    }
    // encounter() (EncountersService.toGraphQL()) deliberately strips
    // client_org_id from its own return shape — a second, trivial lookup
    // by an id already proven accessible to this caller, not a re-
    // derivation of the access check itself. The session's org is always
    // the ENCOUNTER's org, not necessarily the caller's own (a platform
    // operator reviewing a real org's encounter must meter/gate against
    // that org, never their own absent one).
    const rawEncounter = await this.prisma.encounters.findUniqueOrThrow({
      where: { id: input.encounter_id },
      select: { client_org_id: true, patient_id: true },
    });
    const orgId = rawEncounter.client_org_id;

    const quota = await this.entitlementsService.getQuota(orgId, QUOTA_KEY);
    if (quota != null) {
      const used = await this.minutesUsedThisMonth(orgId);
      if (used >= quota) {
        throw new ForbiddenException(
          `Your organization's plan allows ${quota} AI transcription minutes per month (already used ${used}). Upgrade your plan to continue.`,
        );
      }
    }

    const session = await this.prisma.aiTranscriptionSessions.create({
      data: {
        client_org_id: orgId,
        encounter_id: input.encounter_id,
        patient_id: rawEncounter.patient_id,
        consented_by_user_id: user.sub,
        consented_at: new Date(),
        status: 'recording',
      },
    });
    return this.toGraphQL(session);
  }

  async submitTranscription(input: SubmitTranscriptionInput, user: JwtPayload) {
    const session = await this.loadSessionForUser(input.session_id, user);

    const providerConfig = await this.prisma.aiProviderConfig.findUnique({
      where: { client_org_id_purpose: { client_org_id: session.client_org_id, purpose: 'transcription' } },
    });
    if (!providerConfig || !providerConfig.is_active) {
      return this.markFailed(session.id, 'No active transcription provider configured for your organization');
    }
    const provider = getTranscriptionProvider(providerConfig.provider);
    if (!provider) {
      return this.markFailed(session.id, `Unknown provider "${providerConfig.provider}"`);
    }
    const credentials = decryptJson<Record<string, string>>(providerConfig.credentials_encrypted);

    // FR-AI-07 — audioBase64 lives only in this method's own call stack
    // (the request body, then this local variable, then the provider
    // call below); it is never assigned to anything written to Postgres.
    const result = await provider.transcribe(credentials, input.audio_base64, input.language_hint);
    if (!result.transcribed) {
      return this.markFailed(session.id, result.error ?? 'Transcription failed');
    }

    const updated = await this.prisma.aiTranscriptionSessions.update({
      where: { id: session.id },
      data: {
        status: 'transcribed',
        provider: providerConfig.provider,
        raw_transcript: result.text,
        duration_seconds: input.duration_seconds,
      },
    });
    return this.toGraphQL(updated);
  }

  private async markFailed(sessionId: string, message: string) {
    const updated = await this.prisma.aiTranscriptionSessions.update({
      where: { id: sessionId },
      data: { status: 'failed', error_message: message },
    });
    return this.toGraphQL(updated);
  }

  // FR-AI-03, FR-AI-05, FR-AI-06, FR-AI-13 — writes DRAFT sections/vitals
  // flagged ai_generated: true. Goes through the exact same tables
  // (EncounterNotes/Vitals) and therefore the exact same Postgres lock
  // trigger every human write already respects (reject_write_if_encounter_locked)
  // — no separate enforcement needed here for FR-AI-13 to hold.
  async structureAndSaveNotes(sessionId: string, user: JwtPayload) {
    const session = await this.loadSessionForUser(sessionId, user);
    if (!session.raw_transcript) {
      throw new BadRequestException('No transcript available for this session yet');
    }
    const encounter = await this.encountersService.encounter(session.encounter_id, user);
    if ((encounter as any).locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited');
    }

    const { sections } = structureTranscript(session.raw_transcript);
    const savedSections: { section: string; content: string }[] = [];
    for (const [section, content] of Object.entries(sections)) {
      if (!content) continue;
      const existing = await this.prisma.encounterNotes.findUnique({
        where: { encounter_id_section: { encounter_id: session.encounter_id, section } },
      });
      await this.prisma.encounterNotes.upsert({
        where: { encounter_id_section: { encounter_id: session.encounter_id, section } },
        create: { encounter_id: session.encounter_id, section, content, version: 1, ai_generated: true, ai_source_session_id: session.id },
        update: { content, version: (existing?.version ?? 1) + 1, ai_generated: true, ai_source_session_id: session.id },
      });
      savedSections.push({ section, content });
    }

    const extractedVitals = extractVitals(session.raw_transcript);
    if (extractedVitals.length > 0) {
      await this.prisma.vitals.createMany({
        data: extractedVitals.map((v) => ({
          encounter_id: session.encounter_id,
          code: v.code,
          value: v.value,
          unit: VITAL_UNITS[v.code],
          recorded_by_user_id: user.sub,
          ai_generated: true,
          ai_source_session_id: session.id,
        })),
      });
    }

    await this.prisma.aiTranscriptionSessions.update({ where: { id: session.id }, data: { status: 'structured' } });

    return {
      success: true,
      sections: savedSections,
      vitals: extractedVitals,
    };
  }

  // FR-AI-04 — a real, first-pass extraction (see prescription-extraction.ts's
  // own comment on why this is deterministic pattern matching, not true
  // NLU) plus a real fuzzy match against this org's actual Drugs master.
  // Returns drafts only; nothing here is persisted as a PrescriptionItems
  // row — the frontend pre-fills the existing, already-built prescription
  // builder with these, and REQ021's own createPrescription mutation
  // (unchanged) is what a clinician actually submits through.
  async extractPrescriptionDraft(sessionId: string, user: JwtPayload) {
    const session = await this.loadSessionForUser(sessionId, user);
    if (!session.raw_transcript) {
      throw new BadRequestException('No transcript available for this session yet');
    }
    // Enforces clinician self-scoping on this session's own encounter —
    // same reuse-not-re-derive reasoning as structureAndSaveNotes() above.
    await this.encountersService.encounter(session.encounter_id, user);
    const draftItems = extractPrescriptionDraftFromTranscript(session.raw_transcript);
    const results = await Promise.all(
      draftItems.map(async (item) => {
        const match = await this.prisma.drugs.findFirst({
          where: {
            is_deleted: false,
            OR: isPlatformOperator(user) ? undefined : [{ client_org_id: null }, { client_org_id: user.client_org_id }],
            name: { contains: item.drug_name_text, mode: 'insensitive' },
          },
        });
        return {
          drug_name_text: item.drug_name_text,
          drug_id: match?.id,
          matched_drug_name: match?.name,
          dose: item.dose,
          frequency: item.frequency,
          duration_days: item.duration_days,
        };
      }),
    );
    return results;
  }

  // ── Pre-consult summary (FR-AI-09) ──────────────────────────────────────
  // Pure re-ranking of two already-real, already-access-checked queries —
  // no new access-control logic needed here at all.
  async preConsultSummary(patientId: string, user: JwtPayload) {
    const [timeline, allergies] = await Promise.all([
      this.encountersService.patientTimeline(patientId, user),
      this.encountersService.patientAllergyBanner(patientId, user),
    ]);
    return buildPreConsultSummary(
      timeline as any,
      (allergies as any[]).map((a) => ({ text: a.text })),
    );
  }

  // ── Coding assist (P2-02) ────────────────────────────────────────────────
  // Reuses encountersService.encounter()'s own self-scoping (clinician must
  // be on this encounter, org boundary already enforced) rather than
  // re-deriving it — the same "reuse, don't re-derive" pattern
  // extractPrescriptionDraft/preConsultSummary above already use. Draft
  // suggestions only: nothing here writes a Diagnoses row. Works against
  // ANY encounter with saved EncounterNotes content, whether typed by hand
  // or produced by the ambient scribe (P1-11) — deliberately not gated
  // behind the paid ai_scribe entitlement, since this is pure deterministic
  // matching with no external vendor cost, unlike transcription itself.
  async suggestEncounterCodes(encounterId: string, user: JwtPayload) {
    const encounter = await this.encountersService.encounter(encounterId, user);
    const noteText = ((encounter as any).notes ?? []).map((n: any) => n.content).join(' ');

    const [icd10Codes, procedureCodes] = await Promise.all([
      this.prisma.icd10Codes.findMany({ where: { is_active: true } }),
      this.prisma.procedureCodes.findMany({ where: { is_active: true } }),
    ]);

    return {
      diagnosis_suggestions: suggestCodes(noteText, icd10Codes),
      procedure_suggestions: suggestCodes(noteText, procedureCodes),
    };
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  // Org-scoping only — clinician self-scoping (this session's own encounter
  // must be theirs) is enforced by the encountersService.encounter() call
  // every caller of this session already makes right after, reusing that
  // check rather than re-deriving it here (that method's own
  // loadEncounterForUser() already rejects a clinician who isn't on the
  // encounter with the same NotFoundException).
  private async loadSessionForUser(id: string, user: JwtPayload) {
    const session = await this.prisma.aiTranscriptionSessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Transcription session not found');
    if (!isPlatformOperator(user) && session.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Transcription session not found');
    }
    return session;
  }

  private toGraphQL(session: any) {
    return {
      id: session.id,
      encounter_id: session.encounter_id,
      status: session.status,
      provider: session.provider ?? undefined,
      raw_transcript: session.raw_transcript ?? undefined,
      error_message: session.error_message ?? undefined,
      consented_at: session.consented_at,
      created_at: session.created_at,
    };
  }
}

// Mirrors encounters.service.ts's own VITAL_UNITS map exactly (that one is
// module-private there too) — duplicated rather than exported/imported
// across modules for one small const, matching this codebase's own
// established tolerance for small duplication over a cross-module coupling
// for something this trivial (see e.g. public.service.ts's own
// OVERLAP_CONSTRAINT_NAMES duplication from appointments.service.ts).
const VITAL_UNITS: Record<string, string> = {
  height_cm: 'cm',
  weight_kg: 'kg',
  temperature_c: '°C',
  pulse_bpm: 'bpm',
  bp_systolic: 'mmHg',
  bp_diastolic: 'mmHg',
  spo2_percent: '%',
};
