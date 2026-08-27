// REQ159 (P2-07, scoped) — a real allergy hard-stop against the patient's
// own structured allergy records (Diagnoses rows, type='allergy' — see
// encounters.service.ts's patientAllergyBanner(), reused verbatim by the
// caller of this module, not re-derived).
//
// Deliberately NOT a drug-drug interaction checker — that needs real
// interaction-pair data (e.g. Warfarin + Aspirin) this codebase has
// none of, and the PRD's own open question on drug-database
// build-vs-licensing is unresolved. Fabricating interaction data for a
// safety-critical hard-stop would be worse than not building it; see
// REQ159's own scope note. This module only compares a drug against a
// free-text allergy record.
//
// Matching is a bidirectional substring check on normalized text, the
// same "deterministic, honestly non-exhaustive" ethic as
// column-mapping.ts/denial-classification.ts elsewhere in this
// codebase — not a drug-class ontology. It catches an allergy recorded
// by (generic) drug name against the prescribed drug's own name/
// composition text ("Amoxicillin" allergy vs. an Amoxicillin drug;
// "Sulfa" allergy vs. a Sulfamethoxazole composition; "Aspirin allergy"
// free text vs. an Aspirin drug). It will NOT catch a drug-CLASS-level
// allergy where neither string contains the other ("Penicillin" allergy
// vs. an Amoxicillin drug, even though Amoxicillin is penicillin-class)
// — a real, named limitation requiring either a licensed drug-class
// ontology or manual admin curation, not silently claimed as covered.

export interface AllergyRecord {
  id: string;
  text: string;
}

export interface DrugForAllergyCheck {
  name: string;
  composition?: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Returns the first conflicting allergy record, or null if none of the
 * patient's active allergies textually match this drug.
 */
export function findAllergyConflict(drug: DrugForAllergyCheck, allergies: AllergyRecord[]): AllergyRecord | null {
  const drugName = normalize(drug.name);
  const drugText = normalize(`${drug.name} ${drug.composition ?? ''}`);
  if (!drugName) return null;

  for (const allergy of allergies) {
    const allergyText = normalize(allergy.text);
    // Too short to safely match without noise (e.g. a bare "1" or "-").
    if (allergyText.length < 3) continue;
    if (drugText.includes(allergyText) || allergyText.includes(drugName)) {
      return allergy;
    }
  }
  return null;
}
