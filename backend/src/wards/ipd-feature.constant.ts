/**
 * REQ179 — the plan feature-flag key that gates the whole IPD capability.
 *
 * Mirrors `AI_SCRIBE_FEATURE_KEY`'s precedent: an exported constant rather
 * than a string literal repeated across every resolver, so the key and the
 * frontend's own `FEATURE_FLAG_KEYS` list (`pages/admin/Plans.jsx`) can be
 * grepped as one thing.
 *
 * Note `EntitlementsService.resolveEntitlements()` returns null — meaning
 * ungated — for an org with no plan assigned at all, which is true of every
 * legacy org today. So adding this gate does not switch IPD off for anyone; it
 * only enforces the flag once an org is actually on a plan.
 */
export const IPD_FEATURE_KEY = 'ipd';
