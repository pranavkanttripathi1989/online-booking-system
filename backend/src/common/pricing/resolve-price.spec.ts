import { resolveServicePrice } from './resolve-price';

// REQ016 (US-CAT-04). Pure-function unit tests — no DB, per this codebase's
// own "assert what the service built" testing convention for shared
// helpers used across multiple call sites.
describe('resolveServicePrice', () => {
  it('returns the base price when no overrides exist', () => {
    const product = { price: 50000 };
    expect(resolveServicePrice(product, undefined, undefined)).toBe(50000);
  });

  it('returns null for a null/undefined product', () => {
    expect(resolveServicePrice(null, { patient_category: 'corporate' })).toBeNull();
    expect(resolveServicePrice(undefined, undefined)).toBeNull();
  });

  it('applies a patient-category override when the patient has a matching category', () => {
    const product = { price: 50000, category_pricing_json: { corporate: 40000, staff: 10000 } };
    expect(resolveServicePrice(product, { patient_category: 'corporate' })).toBe(40000);
  });

  it('falls through to the base price when the patient has no matching category override', () => {
    const product = { price: 50000, category_pricing_json: { corporate: 40000 } };
    expect(resolveServicePrice(product, { patient_category: 'general' })).toBe(50000);
    expect(resolveServicePrice(product, undefined)).toBe(50000);
  });

  it('applies a channel override when no category override applies', () => {
    const product = { price: 50000, channel_pricing_json: { online: 45000, walkin: 55000 } };
    expect(resolveServicePrice(product, undefined, 'online')).toBe(45000);
    expect(resolveServicePrice(product, undefined, 'walkin')).toBe(55000);
  });

  it('falls through to the base price when no channel is passed at all', () => {
    const product = { price: 50000, channel_pricing_json: { online: 45000 } };
    expect(resolveServicePrice(product, undefined, undefined)).toBe(50000);
  });

  it('prefers the patient-category override over a channel override when both apply', () => {
    const product = { price: 50000, category_pricing_json: { corporate: 40000 }, channel_pricing_json: { online: 45000 } };
    expect(resolveServicePrice(product, { patient_category: 'corporate' }, 'online')).toBe(40000);
  });

  it('is unaffected by a malformed (non-object) pricing JSON value', () => {
    const product = { price: 50000, category_pricing_json: 'not-an-object', channel_pricing_json: null };
    expect(resolveServicePrice(product, { patient_category: 'corporate' }, 'online')).toBe(50000);
  });

  it('returns null when the base price itself is null and no override applies', () => {
    const product = { price: null };
    expect(resolveServicePrice(product, undefined, undefined)).toBeNull();
  });
});
