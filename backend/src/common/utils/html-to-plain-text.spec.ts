import { htmlToPlainText } from './html-to-plain-text';

describe('htmlToPlainText', () => {
  it('returns an empty string for null/undefined/empty input', () => {
    expect(htmlToPlainText(null)).toBe('');
    expect(htmlToPlainText(undefined)).toBe('');
    expect(htmlToPlainText('')).toBe('');
  });

  it('returns plain text unchanged (backward compatibility with pre-rich-text notes)', () => {
    expect(htmlToPlainText('Fever x2 days')).toBe('Fever x2 days');
  });

  it('strips inline formatting tags without losing text', () => {
    expect(htmlToPlainText('<p>Patient has <strong>severe</strong> <em>fever</em>.</p>')).toBe(
      'Patient has severe fever.',
    );
  });

  it('converts block-level closing tags and <br> into newlines', () => {
    expect(htmlToPlainText('<p>Line one</p><p>Line two</p>')).toBe('Line one\nLine two');
    expect(htmlToPlainText('<p>Line one<br>Line two</p>')).toBe('Line one\nLine two');
  });

  it('converts a bullet list into one line per item', () => {
    expect(htmlToPlainText('<ul><li>Rest</li><li>Fluids</li></ul>')).toBe('Rest\nFluids');
  });

  it('decodes common HTML entities', () => {
    expect(htmlToPlainText('<p>Q&amp;A &lt;important&gt; &quot;note&quot;</p>')).toBe('Q&A <important> "note"');
  });

  it('collapses excessive blank lines', () => {
    expect(htmlToPlainText('<p>A</p><p></p><p></p><p>B</p>')).toBe('A\n\nB');
  });
});
