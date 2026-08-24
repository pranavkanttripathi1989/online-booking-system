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
