import { pdfLabel, frequencyLabel } from './i18n-labels';

// P2-08 (REQ021 US-RX-07)
describe('pdfLabel', () => {
  it('returns the Hindi label for a known key', () => {
    expect(pdfLabel('patient', 'hi')).toBe('रोगी');
    expect(pdfLabel('signature', 'hi')).toBe('हस्ताक्षर');
  });

  it('returns the English label unchanged for the default language', () => {
    expect(pdfLabel('patient', 'en')).toBe('Patient');
    expect(pdfLabel('duplicate', 'en')).toBe('DUPLICATE');
  });
});

describe('frequencyLabel', () => {
  it('translates every real PrescriptionItems.frequency code to Hindi', () => {
    expect(frequencyLabel('OD', 'hi')).toBe('दिन में एक बार');
    expect(frequencyLabel('BD', 'hi')).toBe('दिन में दो बार');
    expect(frequencyLabel('TDS', 'hi')).toBe('दिन में तीन बार');
    expect(frequencyLabel('QID', 'hi')).toBe('दिन में चार बार');
    expect(frequencyLabel('HS', 'hi')).toBe('सोते समय');
    expect(frequencyLabel('SOS', 'hi')).toBe('आवश्यकतानुसार');
  });

  it('translates to the equivalent English phrase, not just the raw code, for the English default', () => {
    expect(frequencyLabel('BD', 'en')).toBe('Twice daily');
  });

  it('falls back to the raw code for an unrecognised frequency value, never throwing', () => {
    expect(frequencyLabel('WEIRD', 'hi')).toBe('WEIRD');
  });

  it('returns an empty string, not "undefined", for a missing frequency', () => {
    expect(frequencyLabel(null, 'hi')).toBe('');
    expect(frequencyLabel(undefined, 'en')).toBe('');
  });
});
