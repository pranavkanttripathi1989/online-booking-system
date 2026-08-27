import { extractPrescriptionDraft } from './prescription-extraction';

describe('extractPrescriptionDraft', () => {
  it('extracts drug name, dose, frequency, and duration from a well-formed dictation', () => {
    const items = extractPrescriptionDraft('Tab Paracetamol 650mg twice daily for 5 days.');
    expect(items).toEqual([{ drug_name_text: 'Paracetamol', dose: '650mg', frequency: 'BD', duration_days: 5 }]);
  });

  it('converts a week-based duration to days', () => {
    const items = extractPrescriptionDraft('Cap Omeprazole 20mg once daily for 2 weeks.');
    expect(items[0].duration_days).toBe(14);
  });

  it('recognizes the OD/BD/TDS/QID/HS/SOS abbreviations directly', () => {
    expect(extractPrescriptionDraft('Tab Metformin 500mg BD for 30 days.')[0].frequency).toBe('BD');
    expect(extractPrescriptionDraft('Tab Aspirin 75mg OD for 10 days.')[0].frequency).toBe('OD');
    expect(extractPrescriptionDraft('Cap Amoxicillin 500mg TDS for 7 days.')[0].frequency).toBe('TDS');
    expect(extractPrescriptionDraft('Tab Ibuprofen 400mg QID for 3 days.')[0].frequency).toBe('QID');
    expect(extractPrescriptionDraft('Tab Zolpidem 5mg HS for 5 days.')[0].frequency).toBe('HS');
    expect(extractPrescriptionDraft('Tab Ondansetron 4mg SOS.')[0].frequency).toBe('SOS');
  });

  it('extracts multiple drugs from separate sentences', () => {
    const items = extractPrescriptionDraft('Tab Paracetamol 650mg BD for 5 days. Cap Amoxicillin 500mg TDS for 7 days.');
    expect(items).toHaveLength(2);
    expect(items[0].drug_name_text).toBe('Paracetamol');
    expect(items[1].drug_name_text).toBe('Amoxicillin');
  });

  it('recognizes Syp and Inj markers too, not just Tab/Cap', () => {
    expect(extractPrescriptionDraft('Syp Cough syrup 10ml BD for 5 days.')[0].drug_name_text).toMatch(/Cough syrup/);
    expect(extractPrescriptionDraft('Inj Ceftriaxone 1g OD for 3 days.')[0].drug_name_text).toBe('Ceftriaxone');
  });

  it('never fabricates a drug from a sentence with no Tab/Cap/Syp/Inj marker — the deliberate false-negative-over-false-positive bias', () => {
    expect(extractPrescriptionDraft('Patient should rest and drink plenty of fluids.')).toEqual([]);
  });

  it('still returns a drug even when dose/frequency/duration are missing — partial extraction, not all-or-nothing', () => {
    const items = extractPrescriptionDraft('Tab Vitamin D.');
    expect(items).toEqual([{ drug_name_text: 'Vitamin D', dose: undefined, frequency: undefined, duration_days: undefined }]);
  });

  it('returns an empty array for a transcript with no prescription content', () => {
    expect(extractPrescriptionDraft('Patient reports feeling better overall.')).toEqual([]);
  });
});
