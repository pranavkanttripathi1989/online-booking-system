import { escapeHtml } from './escape-html';
import { htmlToPlainText } from './html-to-plain-text';

describe('escapeHtml', () => {
  it('returns an empty string for null/undefined/empty input', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Fever x2 days')).toBe('Fever x2 days');
  });

  it('escapes a stored-XSS payload rather than passing it through', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes ampersands, quotes, and apostrophes', () => {
    expect(escapeHtml(`Tom & Jerry's "great" day`)).toBe('Tom &amp; Jerry&#39;s &quot;great&quot; day');
  });

  it('round-trips through htmlToPlainText back to the original text', () => {
    const original = `<script>&"'`;
    expect(htmlToPlainText(escapeHtml(original))).toBe(original);
  });
});
