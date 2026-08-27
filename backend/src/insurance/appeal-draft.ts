import { DenialCategory, DENIAL_CATEGORY_LABELS } from './denial-classification';

// P2-03 -- a templated, category-specific appeal-letter body. Pure text
// composition, no external call: every fact in the output is either a
// literal claim field passed in by the caller or one of a small, fixed
// set of category-specific opening paragraphs -- nothing here is ever
// invented about the claim itself. This is a DRAFT for a human to review,
// edit and approve (InsuranceService#approveClaimAppeal), never
// auto-submitted anywhere.

const OPENING_PARAGRAPHS: Record<DenialCategory, string> = {
  missing_documentation:
    'We are writing to appeal the rejection of the above claim on the grounds of missing documentation. Please find the complete supporting documentation for this claim enclosed below.',
  coding_mismatch:
    'We are writing to appeal the rejection of the above claim on the grounds of a coding discrepancy. The diagnosis and procedure codes for this visit have been reviewed and are detailed below.',
  not_covered:
    'We are writing to appeal the rejection of the above claim on the grounds that the service was deemed not covered. We respectfully request a re-evaluation of coverage in light of the clinical evidence enclosed below.',
  authorization_required:
    'We are writing to appeal the rejection of the above claim on the grounds of missing prior authorization. We request the claim be reconsidered, and enclose the supporting clinical documentation below.',
  duplicate_claim:
    'We are writing to appeal the rejection of the above claim, which was flagged as a duplicate. We confirm this claim corresponds to a distinct, single visit, detailed below.',
  other:
    'We are writing to appeal the rejection of the above claim. We enclose the supporting clinical documentation below for reconsideration.',
};

export interface AppealDraftClaim {
  id: string;
  payerName: string;
  patientName: string;
  appointmentDate: Date | string | null | undefined;
  claimAmountRupees: number;
  rejectionReason: string;
}

export interface AppealDraftEvidenceItem {
  issuedAt: Date | string;
  drugNames: string[];
}

export function buildAppealDraft(
  claim: AppealDraftClaim,
  category: DenialCategory,
  evidence: AppealDraftEvidenceItem[],
): string {
  const lines: string[] = [];
  lines.push(`Appeal — Claim ${claim.id}`);
  lines.push('');
  lines.push(`Payer: ${claim.payerName}`);
  lines.push(`Patient: ${claim.patientName}`);
  lines.push(`Visit Date: ${formatDate(claim.appointmentDate)}`);
  lines.push(`Claim Amount: ₹${claim.claimAmountRupees.toFixed(2)}`);
  lines.push(`Denial Reason (as recorded): ${claim.rejectionReason}`);
  lines.push(`Denial Category: ${DENIAL_CATEGORY_LABELS[category]}`);
  lines.push('');
  lines.push(OPENING_PARAGRAPHS[category]);
  lines.push('');
  lines.push('Supporting Evidence:');
  if (evidence.length === 0) {
    lines.push('  No prescriptions on file for this claim\'s appointment.');
  } else {
    for (const item of evidence) {
      lines.push(`  • Prescription (${formatDate(item.issuedAt)}): ${item.drugNames.join(', ') || 'No items recorded'}`);
    }
  }
  lines.push('');
  lines.push('We respectfully request reconsideration of this claim in light of the above. Please contact us for any further information required.');
  return lines.join('\n');
}

function formatDate(d: Date | string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';
}
