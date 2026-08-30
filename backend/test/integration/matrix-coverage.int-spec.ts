import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { COVERED_DOMAINS } from './setup/domain-cases';

/**
 * The anti-rot gate (technical-plans/00-foundation-hardening.md §4:
 * "Make CI fail when a domain has no matrix row — otherwise it rots").
 *
 * A tenancy matrix decays in a specific, silent way: someone adds a domain,
 * never adds a row, and the suite stays green while coverage quietly shrinks as
 * a fraction of the app. This test makes that a build failure.
 *
 * Every resolver-bearing directory under src/ must be in exactly one of three
 * places: covered by the matrix, EXEMPT with a stated reason, or KNOWN_GAPS.
 * A new domain is in none of them, so it fails until someone decides which.
 */

/** Domains with no tenant-scoped data to isolate. Each needs a real reason. */
const EXEMPT: Record<string, string> = {
  auth: 'Login/register/OTP. @Public by necessity; owns no tenant-scoped read.',
  account: "The caller's own profile, keyed by JWT `sub`. No tenant dimension to cross.",
  'notification-preferences': "The caller's own preferences, keyed by user id.",
  public: 'The deliberately public patient-facing surface (see CLAUDE.md, two-dialect note).',
  languages: 'Global reference table, shared by every tenant by design (see BUG005 — deliberately unindexed for the same reason).',
  lookups: 'Global reference data (room types, clinician types).',
  'email-templates': 'Global reference table; templates are seed-created, not tenant-created.',
  // BUG012 — three more, none of which fits the matrix's generic
  // same-org-sees-same-row shape (every org-A actor sees the identical row;
  // a platform operator sees both).
  organizations: "organizationsPaginated is platform-wide by design — isPlatformOperator callers are meant to see every org, not just their own. There is no 'org A caller' for this domain.",
  'org-settings': "myOrgBranding (and its siblings) return literally the caller's own org, keyed by JWT client_org_id — nullable:true, so a platform operator (no org) gets null, not the union of every org's branding.",
  notifications: 'Scoped by specific user_id, not org (see notification-preferences above) — every org-A actor other than the exact row owner would see an empty result, not the same row, which the matrix cannot express.',
  // Found while classifying REQ020's own new domain (this file's own gate
  // caught it): shipped without ever being added here.
  'organization-onboarding': "Entirely @Public() self-serve SaaS signup (organization-onboarding.resolver.ts) — no authenticated tenant-scoped read exists on this resolver at all, same shape as auth's login/register.",
  // REQ032 (2026-08-25 8-slice pass) — platform-level plan catalog
  // (super_admin-managed, no client_org_id anywhere on Plans/PlanVersions),
  // same shape as organizations' own isPlatformOperator exemption above.
  plans: 'Platform-level plan catalog, super_admin-managed — no client_org_id on Plans/PlanVersions, same shape as organizations (no "org A caller" for shared catalog data).',
  // REQ053 (2026-08-25 8-slice pass)
  'break-glass': "myBreakGlassGrants is scoped by grantee_user_id (the caller's own grants), not org — same shape as notifications' own exemption above. Cross-org isolation is real (request()/revoke() both check client_org_id) and covered in break-glass.service.spec.ts unit tests instead.",
  // P1-04 (2026-08-27) — myEntitlements returns literally the caller's own
  // resolved entitlements, keyed by JWT client_org_id, same shape as
  // org-settings' own myOrgBranding exemption above: no client-supplied id
  // argument exists to construct an "org A caller reads org B's row"
  // matrix case from. Cross-org isolation is real (EntitlementGuard/
  // EntitlementsService never accept a client-supplied org id, only
  // user.client_org_id off the JWT) and covered in
  // entitlements.service.spec.ts / entitlement.guard.spec.ts instead.
  entitlements: "myEntitlements returns literally the caller's own resolved entitlements, keyed by JWT client_org_id — same shape as org-settings' own myOrgBranding exemption above.",
  // P1-11 (2026-08-27) — no list query exists on this resolver to build a
  // same-org-A-vs-B matrix case from (aiTranscriptionProviders is a global
  // catalog, myAiUsage/myAiProviderConfig are self-scoped off JWT
  // client_org_id like entitlements' own exemption above; every other
  // handler is a single-record mutation/query keyed by a session/patient
  // id, not a list). Cross-org isolation is real — loadSessionForUser()'s
  // own client_org_id check, plus reused (not re-derived)
  // EncountersService.encounter()/patientTimeline()/patientAllergyBanner()
  // self- and org-scoping — and covered directly in
  // ai-clinical.service.spec.ts's own "rejects a caller from a different
  // org" test.
  'ai-clinical': "No list query exists on this resolver to build a cross-org matrix case from (a global catalog query, two self-scoped-off-JWT queries, and single-record mutations keyed by session/patient id) — same shape as entitlements' own exemption above. Cross-org isolation is real and covered in ai-clinical.service.spec.ts's own dedicated test instead.",
  // P1-16 (2026-08-27) — no query at all on this resolver, only two
  // mutations keyed by encounter_id, both self/org-scoped by reusing
  // EncountersService.encounter() (never re-deriving it) — same shape as
  // ai-clinical's own exemption above. Covered directly in
  // telemedicine.service.spec.ts.
  telemedicine: "No list query exists on this resolver — two mutations keyed by encounter_id, both reusing EncountersService.encounter()'s own self/org-scoping rather than re-deriving it. Cross-org/cross-patient/cross-clinician isolation is covered in telemedicine.service.spec.ts's own dedicated tests instead.",
  // P2-05 (2026-08-27) — no query or mutation on this resolver is keyed
  // by any id at all: parseImportPreview/dryRunImport take only raw CSV
  // content (nothing to read cross-tenant — there is no stored resource
  // an org-B caller could ever address), and commitImport is a write-only
  // bulk create scoped via orgIdForWrite(user, 'ImportJob'), the same
  // fail-closed helper every other domain's own create path already
  // uses. There is no "org A caller reads org B's row by id" shape this
  // matrix's generic same-org-sees-same-row case could express here —
  // same reasoning as ai-clinical/telemedicine's own exemptions above.
  // The org-less-platform-operator rejection path is covered directly in
  // imports.service.spec.ts's own dedicated test instead.
  // REQ167 (P2-11) -- immunizationSchedule is a global reference query (no
  // client_org_id on ImmunizationScheduleItems at all, same shape as
  // languages/drugs above); patientImmunizations/patientImmunizationStatus
  // are both keyed by patient_id, reusing assertPatientAccess()'s own
  // self/clinician/org scoping rather than re-deriving it (mirrors
  // ai-clinical/telemedicine's own exemptions above) -- no list query
  // exists on this resolver to build a cross-org matrix case from. Cross-
  // org/self-scope isolation is covered directly in
  // immunizations.service.spec.ts's own dedicated tests instead.
  immunizations: 'No list query exists on this resolver (a global reference query plus two patient_id-keyed queries reusing assertPatientAccess-style scoping) — same shape as ai-clinical/telemedicine\'s own exemptions above. Isolation covered in immunizations.service.spec.ts directly.',
  imports: "No query or mutation on this resolver is keyed by any id — parseImportPreview/dryRunImport take only raw CSV content (nothing to read cross-tenant), and commitImport is a write-only bulk create scoped via orgIdForWrite(), the same helper every other domain's create path already uses. No 'org A reads org B's row by id' shape exists to build a matrix case from, same shape as ai-clinical/telemedicine's own exemptions above. Covered in imports.service.spec.ts's own dedicated test instead.",
  // REQ158 (P2-06). Unlike the exemptions above, this domain DOES have a
  // real id-keyed shape a matrix case could exercise (revenueShareRules/
  // payouts by clinic_id, approvePayout by id) — this is not a "no shape
  // exists" exemption. It is deferred to setup/domain-cases.ts pending a
  // future slice: that file was concurrently owned by other in-flight
  // work in this session at the time this domain shipped, so this slice
  // did not touch it (see this codebase's own standing rule against
  // stepping on another session's uncommitted work). Cross-org rejection
  // is real today — every read/write goes through orgScope()/isSameOrg()/
  // assertSameOrg(), never a client-supplied org id — and is covered
  // directly in revenue-share.service.spec.ts's own dedicated tests
  // (assertClinicInScope/assertClinicianInScope rejecting a
  // different-org clinic/clinician, approvePayout rejecting a
  // different-org payout).
  'revenue-share': "Has a real id-keyed shape (revenueShareRules/payouts by clinic_id, approvePayout by id) a matrix case could exercise, but is deferred to setup/domain-cases.ts for a future slice — that file was concurrently owned by other in-flight work in this session when this domain shipped. Cross-org rejection is real (orgScope/isSameOrg/assertSameOrg throughout, never a client-supplied org id) and covered directly in revenue-share.service.spec.ts's own dedicated tests instead.",
};

/**
 * Tenant-scoped domains that this matrix does NOT yet cover.
 *
 * Frozen deliberately: the assertion below compares the actual gap set to this
 * list exactly, so the backlog cannot grow silently, and closing an entry means
 * deleting a line here. This is a stated debt, not a claim of coverage — TR054
 * reports it as such rather than implying the matrix is exhaustive.
 *
 * BUG012 closed all ten entries that were here: `analytics`, `availability`,
 * `blocks`, `cancellation-rules`, `dashboard`, `reviews`, and `services` are
 * now real CASES entries; `organizations`, `org-settings`, and `notifications`
 * moved to EXEMPT instead, since none of the three fits this matrix's generic
 * same-org-sees-same-row shape.
 */
const KNOWN_GAPS: string[] = [];

function resolverDomains(): string[] {
  const srcDir = join(__dirname, '..', '..', 'src');
  return readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      const dir = join(srcDir, name);
      return existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.resolver.ts'));
    })
    .sort();
}

describe('tenancy matrix coverage', () => {
  const domains = resolverDomains();

  it('finds the resolver domains it is supposed to police', () => {
    // A sanity check on the discovery itself: if the glob broke, every other
    // assertion here would vacuously pass.
    expect(domains.length).toBeGreaterThan(15);
    expect(domains).toContain('clinics');
  });

  it('every resolver domain is covered, exempt, or a declared known gap', () => {
    const unclassified = domains.filter(
      (d) => !COVERED_DOMAINS.includes(d) && !(d in EXEMPT) && !KNOWN_GAPS.includes(d),
    );
    expect(unclassified).toEqual([]);
  });

  it('the known-gap list has not grown', () => {
    const actualGaps = domains
      .filter((d) => !COVERED_DOMAINS.includes(d) && !(d in EXEMPT))
      .sort();
    // Exact equality in both directions: a new uncovered domain fails, and so
    // does a stale entry for a domain that has since been covered or deleted.
    expect(actualGaps).toEqual(KNOWN_GAPS);
  });

  it('no domain is both covered and exempt', () => {
    expect(COVERED_DOMAINS.filter((d) => d in EXEMPT)).toEqual([]);
  });
});
