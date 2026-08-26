// This project's tsconfig has allowSyntheticDefaultImports but not
// esModuleInterop -- `import PDFDocument from 'pdfkit'` type-checks (the
// former flag) but compiles to `pdfkit_1.default`, which is undefined at
// runtime since pdfkit's CJS export has no `.default` (the latter flag is
// what would add that interop wrapper). The `= require(...)` form always
// binds directly to `module.exports`, working correctly either way.
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

// REQ057 (US-PAT-02) — the one place a Buffer is assembled from a pdfkit
// document. pdfkit is a stream, not a promise-returning renderer; every
// call site pipes into this instead of hand-rolling its own
// buffer-collection boilerplate. Deliberately pdfkit, not puppeteer — pure
// JS, no bundled/downloaded Chromium, matching this session's own
// documented host disk/memory pressure.
export function renderPdfToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      build(doc);
    } catch (e) {
      reject(e);
      return;
    }
    doc.end();
  });
}

// REQ139 — org-branding.controller.ts always stores logo_url as a
// same-origin relative path (`/uploads/branding/<file>`), never a full
// URL, so resolving it back to a real file is a local filesystem lookup,
// not a network fetch. Three directories up from src/common/pdf/ is
// backend/, matching org-branding.controller.ts's own UPLOAD_DIR
// (path.join(__dirname, '..', '..', 'uploads', 'branding') from
// src/org-settings/) and main.ts's own useStaticAssets() root.
const UPLOADS_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

function resolveLogoPath(logoUrl?: string): string | undefined {
  if (!logoUrl || !logoUrl.startsWith('/uploads/')) return undefined;
  const resolved = path.join(UPLOADS_ROOT, logoUrl.slice('/uploads/'.length));
  return fs.existsSync(resolved) ? resolved : undefined;
}

// Shared letterhead — clinic logo/name/phone at the top, matching the
// same real org-branding fields (REQ002: name/logo_url) printPrescription()
// already reads. A missing/unresolvable logo_url (org never uploaded one,
// or the stored path is stale) silently falls back to the clinic name as
// text only, matching PrescriptionPrint.jsx's own graceful fallback when
// no logo exists -- never a broken document over a missing image.
export function drawLetterhead(doc: PDFKit.PDFDocument, clinicName: string, contactPhone?: string, logoUrl?: string) {
  const logoPath = resolveLogoPath(logoUrl);
  if (logoPath) {
    try {
      doc.image(logoPath, { fit: [64, 64] });
      doc.moveDown(0.3);
    } catch {
      // A file that passed fs.existsSync but isn't a pdfkit-decodable
      // image (corrupt upload, unsupported format slipping past
      // org-branding.controller.ts's own magic-byte check) -- fall
      // through to text-only rather than crash the whole document.
    }
  }
  doc.fontSize(18).font('Helvetica-Bold').text(clinicName, { align: 'left' });
  if (contactPhone) {
    doc.fontSize(10).font('Helvetica').text(contactPhone);
  }
  doc.moveDown(0.5);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#cccccc')
    .stroke();
  doc.moveDown(1);
}
