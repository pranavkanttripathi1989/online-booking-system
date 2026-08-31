// P2-08 (REQ021 US-RX-07) — a small, standalone label dictionary for the
// server-rendered prescription PDF. Deliberately NOT a reuse of the
// frontend's react-i18next bundles (frontend/src/i18n/locales/) -- pdfkit
// renders in Node, not the browser, and this document has its own much
// smaller surface (a handful of static labels, no plural rules, no
// interpolation beyond simple string concatenation already done by the
// caller). Only the app-authored chrome is translated here; drug_name,
// route and instructions are clinician/DB free text and stay exactly as
// entered -- translating those automatically would be a real clinical-
// safety risk (see PLAN's own account of why that's out of scope).

export type PdfLanguage = 'en' | 'hi';

const LABELS: Record<string, Record<PdfLanguage, string>> = {
  patient: { en: 'Patient', hi: 'रोगी' },
  dob: { en: 'DOB', hi: 'जन्म तिथि' },
  gender: { en: 'Gender', hi: 'लिंग' },
  date: { en: 'Date', hi: 'दिनांक' },
  regNo: { en: 'Reg. No', hi: 'पंजीकरण सं.' },
  duplicate: { en: 'DUPLICATE', hi: 'डुप्लीकेट' },
  qty: { en: 'Qty', hi: 'मात्रा' },
  days: { en: 'days', hi: 'दिन' },
  signature: { en: 'Signature', hi: 'हस्ताक्षर' },
  verificationCode: { en: 'Verification code', hi: 'सत्यापन कोड' },
  // REQ171/REQ172 -- clinical-content section + footer labels.
  complaints: { en: 'Complaints', hi: 'शिकायत' },
  exam: { en: 'Physical Examination', hi: 'शारीरिक परीक्षण' },
  diagnosis: { en: 'Diagnosis', hi: 'निदान' },
  advice: { en: 'Advice', hi: 'सलाह' },
  followUp: { en: 'Next Visit', hi: 'अगली तारीख' },
  investigations: { en: 'Investigations', hi: 'निर्धारित परीक्षण' },
  vitals: { en: 'Vitals', hi: 'महत्वपूर्ण संकेत' },
  bmi: { en: 'BMI', hi: 'बीएमआई' },
  bp: { en: 'BP', hi: 'बीपी' },
  height: { en: 'Height', hi: 'ऊंचाई' },
  weight: { en: 'Weight', hi: 'वजन' },
  lmp: { en: 'LMP', hi: 'एलएमपी' },
  edd: { en: 'EDD', hi: 'ईडीडी' },
  gestationalAge: { en: 'Gestational Age', hi: 'गर्भावधि आयु' },
  weeks: { en: 'weeks', hi: 'सप्ताह' },
  composition: { en: 'Composition', hi: 'संरचना' },
  forAppointment: { en: 'For Appointment', hi: 'अपॉइंटमेंट के लिए' },
};

export function pdfLabel(key: keyof typeof LABELS, language: PdfLanguage): string {
  return LABELS[key][language] ?? LABELS[key].en;
}

// PrescriptionItems.frequency is a closed 6-value clinical shorthand enum
// (see schema.prisma's own column comment) -- safe to translate via a fixed
// lookup, unlike route/instructions which are free text.
const FREQUENCY_LABELS: Record<string, Record<PdfLanguage, string>> = {
  OD: { en: 'Once daily', hi: 'दिन में एक बार' },
  BD: { en: 'Twice daily', hi: 'दिन में दो बार' },
  TDS: { en: 'Three times daily', hi: 'दिन में तीन बार' },
  QID: { en: 'Four times daily', hi: 'दिन में चार बार' },
  HS: { en: 'At bedtime', hi: 'सोते समय' },
  SOS: { en: 'As needed', hi: 'आवश्यकतानुसार' },
};

export function frequencyLabel(code: string | null | undefined, language: PdfLanguage): string {
  if (!code) return '';
  return FREQUENCY_LABELS[code]?.[language] ?? code;
}
