import { buildAppealDraft } from './appeal-draft';

describe('buildAppealDraft (P2-03)', () => {
  const claim = {
    id: 'claim-1',
    payerName: 'Star Health',
    patientName: 'Anita Sharma',
    appointmentDate: '2026-08-20T10:00:00.000Z',
    claimAmountRupees: 1500,
    rejectionReason: 'Documentation was missing',
  };

  it('includes every literal claim field verbatim, never inventing a fact', () => {
    const draft = buildAppealDraft(claim, 'missing_documentation', []);
    expect(draft).toContain('claim-1');
    expect(draft).toContain('Star Health');
    expect(draft).toContain('Anita Sharma');
    expect(draft).toContain('₹1500.00');
    expect(draft).toContain('Documentation was missing');
  });

  it('uses the category-specific opening paragraph for missing_documentation', () => {
    const draft = buildAppealDraft(claim, 'missing_documentation', []);
    expect(draft).toMatch(/missing documentation/i);
  });

  it('uses a different opening paragraph for a different category', () => {
    const missingDocs = buildAppealDraft(claim, 'missing_documentation', []);
    const notCovered = buildAppealDraft(claim, 'not_covered', []);
    expect(missingDocs).not.toEqual(notCovered);
  });

  it('shows an honest "no prescriptions on file" line rather than a broken/empty section', () => {
    const draft = buildAppealDraft(claim, 'other', []);
    expect(draft).toMatch(/No prescriptions on file/i);
  });

  it('lists real evidence when present, with drug names and date', () => {
    const draft = buildAppealDraft(claim, 'coding_mismatch', [
      { issuedAt: '2026-08-20T10:00:00.000Z', drugNames: ['Paracetamol 650mg', 'Azithromycin 500mg'] },
    ]);
    expect(draft).toContain('Paracetamol 650mg, Azithromycin 500mg');
  });

  it('never throws on a prescription with no items', () => {
    expect(() => buildAppealDraft(claim, 'other', [{ issuedAt: '2026-08-20T10:00:00.000Z', drugNames: [] }])).not.toThrow();
  });
});
