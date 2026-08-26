import * as fs from 'fs';
import * as path from 'path';
import { renderPdfToBuffer, drawLetterhead } from './render-pdf';

describe('render-pdf', () => {
  describe('renderPdfToBuffer', () => {
    it('produces a real PDF buffer from a build callback', async () => {
      const buffer = await renderPdfToBuffer((doc) => {
        doc.text('hello');
      });
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('rejects when the build callback throws, rather than hanging', async () => {
      await expect(
        renderPdfToBuffer(() => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });
  });

  // REQ139 — org logo propagated into PDF letterheads.
  describe('drawLetterhead — logo embedding', () => {
    it('renders text-only when no logoUrl is given (pre-REQ139 behaviour)', async () => {
      const buffer = await renderPdfToBuffer((doc) => drawLetterhead(doc, 'MG Road Clinic', '+911234'));
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('falls back to text-only, without throwing, when logoUrl does not resolve to a real file', async () => {
      const buffer = await renderPdfToBuffer((doc) =>
        drawLetterhead(doc, 'MG Road Clinic', '+911234', '/uploads/branding/does-not-exist.png'),
      );
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('ignores a logoUrl outside /uploads/ — never a real stored branding path', async () => {
      const buffer = await renderPdfToBuffer((doc) =>
        drawLetterhead(doc, 'MG Road Clinic', '+911234', 'https://evil.example/logo.png'),
      );
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    describe('with a real uploaded logo file on disk', () => {
      // Same on-disk convention as org-branding.controller.ts's own
      // UPLOAD_DIR -- a real 1x1 PNG written under backend/uploads/branding/
      // and removed after, matching this codebase's own established
      // "live-test residue is cleaned up" discipline.
      const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'branding');
      const TEST_FILENAME = '__test-render-pdf-req139__.png';
      const TEST_PATH = path.join(UPLOAD_DIR, TEST_FILENAME);
      // Smallest valid 1x1 transparent PNG.
      const PNG_1X1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );

      beforeAll(() => {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.writeFileSync(TEST_PATH, PNG_1X1);
      });

      afterAll(() => {
        fs.rmSync(TEST_PATH, { force: true });
      });

      it('embeds the real image without throwing', async () => {
        const buffer = await renderPdfToBuffer((doc) =>
          drawLetterhead(doc, 'MG Road Clinic', '+911234', `/uploads/branding/${TEST_FILENAME}`),
        );
        expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      });
    });
  });
});
