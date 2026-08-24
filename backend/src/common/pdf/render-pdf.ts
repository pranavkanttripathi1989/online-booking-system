// This project's tsconfig has allowSyntheticDefaultImports but not
// esModuleInterop -- `import PDFDocument from 'pdfkit'` type-checks (the
// former flag) but compiles to `pdfkit_1.default`, which is undefined at
// runtime since pdfkit's CJS export has no `.default` (the latter flag is
// what would add that interop wrapper). The `= require(...)` form always
// binds directly to `module.exports`, working correctly either way.
import PDFDocument = require('pdfkit');

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

// Shared letterhead — clinic name/logo/phone at the top, matching the
// same real org-branding fields (REQ002: name/logo_url) printPrescription()
// already reads. logo_url is a local-filesystem-relative URL
// (org-branding.controller.ts), not fetched here — embedding a remote/
// local image adds a real failure mode (missing file, wrong format) for
// marginal visual value on a text-first clinical/financial document, so
// this renders the clinic name as text only, matching PrescriptionPrint.jsx's
// own graceful fallback when no logo exists.
export function drawLetterhead(doc: PDFKit.PDFDocument, clinicName: string, contactPhone?: string) {
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
