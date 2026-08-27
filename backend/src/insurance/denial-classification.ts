// P2-03 -- deterministic denial-reason classification, the same
// "deterministic, honestly not true NLU" discipline every other
// ai-clinical/* module in this codebase already documents (no
// classification-LLM provider/credentials exist in this environment to
// call honestly). Rule-based keyword matching over the manager's own
// free-text rejection_reason (UpdateClaimStatusInput.rejection_reason is
// already a required field on a 'rejected' transition -- see
// insurance.service.ts's own updateClaimStatus) into one of a small,
// fixed set of denial categories, each with its own appeal-letter opening
// paragraph in appeal-draft.ts. A missed/'other' classification just
// means a more generic appeal opening -- never a fabricated reason.

export type DenialCategory =
  | 'missing_documentation'
  | 'coding_mismatch'
  | 'not_covered'
  | 'authorization_required'
  | 'duplicate_claim'
  | 'other';

export const DENIAL_CATEGORY_LABELS: Record<DenialCategory, string> = {
  missing_documentation: 'Missing documentation',
  coding_mismatch: 'Coding mismatch',
  not_covered: 'Not covered under policy',
  authorization_required: 'Prior authorization required',
  duplicate_claim: 'Duplicate claim',
  other: 'Other / unclassified',
};

// Checked in this order -- a rejection reason naming both a coding issue
// and a documentation gap is rarer than either alone, and
// authorization/duplicate are the most specific (least likely to false-
// positive against a generic word), so they are checked before the two
// broader categories.
const RULES: Array<[RegExp, DenialCategory]> = [
  [/\b(duplicate|already (submitted|claimed|filed))\b/i, 'duplicate_claim'],
  [/\b(pre-?authoriz\w*|prior authoriz\w*|authorization required|approval required)\b/i, 'authorization_required'],
  [/\b(not covered|exclu(ded|sion)|non-?covered|out of network|not eligible|policy does not cover)\b/i, 'not_covered'],
  [/\b(code|coding|icd|incorrect procedure|invalid code|mismatch)\b/i, 'coding_mismatch'],
  [/\b(missing|incomplete|not (attached|submitted|provided)|documentation|document(s)? required)\b/i, 'missing_documentation'],
];

export function classifyDenial(rejectionReason: string): { category: DenialCategory; label: string } {
  for (const [pattern, category] of RULES) {
    if (pattern.test(rejectionReason)) {
      return { category, label: DENIAL_CATEGORY_LABELS[category] };
    }
  }
  return { category: 'other', label: DENIAL_CATEGORY_LABELS.other };
}
