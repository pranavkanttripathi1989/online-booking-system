import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { AppointmentPaymentsService } from '../appointment-payments/appointment-payments.service';
import { EncountersService } from '../encounters/encounters.service';
// REQ138 (US-INS-06's own follow-on) — reuses InsuranceService's own
// already-org-scoped claim() and claimEvidencePrescriptions() rather than
// re-deriving claim access control here, same "compose existing scoped
// assembly methods" pattern this module already uses for
// prescriptionPdf/invoicePdf/visitSummaryPdf.
import { InsuranceService } from '../insurance/insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { renderPdfToBuffer, drawLetterhead, drawLetterheadFooter, pdfFontName } from '../common/pdf/render-pdf';
import { pdfLabel, frequencyLabel, PdfLanguage } from '../common/pdf/i18n-labels';
import { htmlToPlainText } from '../common/utils/html-to-plain-text';

const formatDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatMoney = (rupees: number) => `₹${rupees.toFixed(2)}`;
// REQ129 (US-RX-08) -- first 12 hex chars of the content hash, grouped for
// human readability. Mirrored verbatim in
// frontend/src/pages/prescriptions/PrescriptionPrint.jsx's own
// formatVerificationCode() -- both must derive the identical display string
// from the same pdf_hash for a printed copy to be checkable against the app.
const formatVerificationCode = (hash: string) =>
  hash.slice(0, 12).toUpperCase().match(/.{1,4}/g)!.join('-');

// REQ057 (US-PAT-02) — downloadable PDFs for prescriptions, invoices, and
// visit summaries. Deliberately composes existing services' own already
// org/self-scoped assembly methods (printPrescription, invoiceForDownload,
// encounter) rather than re-deriving tenant/patient isolation a third
// time — this module owns rendering, not access control.
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly appointmentPaymentsService: AppointmentPaymentsService,
    private readonly encountersService: EncountersService,
    private readonly insuranceService: InsuranceService,
    private readonly prisma: PrismaService,
  ) {}

  // REQ109 — extracted so both the authenticated download (prescriptionPdf)
  // and the OTP-gated share retrieval (prescriptionPdfForShare) render
  // identical bytes from a single drawing implementation, per REQ109's own
  // acceptance criteria ("the exact same bytes printPrescription() already
  // produces").
  private drawPrescriptionPdf(doc: PDFKit.PDFDocument, data: any) {
    // P2-08 (US-RX-07) — a prescription issued in Hindi renders its whole
    // body (including free-text drug/route/instructions, which may
    // themselves be typed in Hindi by the clinician) through the bundled
    // Devanagari font rather than only the translated labels: Noto Sans
    // Devanagari also covers full Latin/₹, so English content is unaffected,
    // and any Hindi free text the clinician actually typed renders
    // correctly instead of showing missing glyphs under 'Helvetica'. The
    // one exception is the ℞ symbol below, which this font doesn't include.
    const language: PdfLanguage = data.prescription.language === 'hi' ? 'hi' : 'en';
    const font = (bold = false) => doc.font(pdfFontName(doc, language, bold));

    // REQ170 -- the letterhead now renders the clinic's own configured
    // doctor roster (tagline + N doctor blocks) instead of a bare
    // name+phone; falls back to [issuing clinician] when the clinic never
    // configured letterhead_clinician_ids, so an org that hasn't touched
    // this feature yet still gets a real doctor block, not a blank header.
    drawLetterhead(doc, data.clinic.name, data.clinic.contact_phone, data.clinic.logo_url, {
      tagline: data.clinic.tagline,
      doctors: data.doctors,
      language,
    });

    font(true).fontSize(11).text(`${pdfLabel('patient', language)}: ${data.patient.full_name}`);
    font().fontSize(9);
    const patientLine = [
      data.patient.date_of_birth ? `${pdfLabel('dob', language)}: ${formatDate(data.patient.date_of_birth)}` : undefined,
      data.patient.gender ? `${pdfLabel('gender', language)}: ${data.patient.gender}` : undefined,
    ]
      .filter(Boolean)
      .join('   ');
    if (patientLine) doc.text(patientLine);
    doc.text(`${pdfLabel('date', language)}: ${formatDate(data.prescription.issued_at)}`);
    doc.moveDown(0.75);

    // REQ171/REQ172 -- the same encounter's own clinical narrative
    // (complaints/vitals/BMI/diagnosis/advice/follow-up), plus obstetric
    // LMP/EDD/gestational age when set. Every line only renders when its
    // value is non-null -- a specialty/clinician that never records these
    // keeps the pre-REQ171 layout exactly.
    const ctx = data.encounter_context;
    if (ctx) {
      font().fontSize(9);
      if (ctx.complaints) doc.text(`${pdfLabel('complaints', language)}: ${ctx.complaints}`);
      const vitalsLine = [
        ctx.bp_systolic != null && ctx.bp_diastolic != null ? `${pdfLabel('bp', language)} ${ctx.bp_systolic}/${ctx.bp_diastolic}` : undefined,
        ctx.height_cm != null ? `${pdfLabel('height', language)} ${ctx.height_cm}cm` : undefined,
        ctx.weight_kg != null ? `${pdfLabel('weight', language)} ${ctx.weight_kg}kg` : undefined,
        ctx.bmi != null ? `${pdfLabel('bmi', language)} ${ctx.bmi}` : undefined,
        ctx.lmp_date ? `${pdfLabel('lmp', language)} ${formatDate(ctx.lmp_date)}` : undefined,
        ctx.edd ? `${pdfLabel('edd', language)} ${formatDate(ctx.edd)}` : undefined,
        ctx.gestational_age_weeks != null
          ? `${pdfLabel('gestationalAge', language)} ${ctx.gestational_age_weeks} ${pdfLabel('weeks', language)}${ctx.gestational_age_days ? ` ${ctx.gestational_age_days}${language === 'hi' ? '' : 'd'}` : ''}`
          : undefined,
      ]
        .filter(Boolean)
        .join('  |  ');
      if (vitalsLine) doc.text(vitalsLine);
      if (ctx.exam) doc.text(`${pdfLabel('exam', language)}: ${ctx.exam}`);
      if (ctx.diagnosis) font(true).text(`${pdfLabel('diagnosis', language)}: ${ctx.diagnosis}`);
      font().fontSize(9);
      doc.moveDown(0.5);
    }

    if (data.is_reprint) {
      doc.save();
      doc.rotate(-30, { origin: [297, 420] });
      font(true).fontSize(60).fillColor('#dddddd').text(pdfLabel('duplicate', language), 130, 390, { lineBreak: false });
      doc.restore();
      doc.fillColor('black');
    }

    // ℞ is a universal pharmacy symbol, not translated text -- and Noto
    // Sans Devanagari doesn't include this glyph, so this line always uses
    // the base font regardless of language.
    doc.fontSize(14).font('Helvetica-Bold').text('℞');
    doc.moveDown(0.5);
    for (const item of data.prescription.items as any[]) {
      font(true).fontSize(10).text(item.drug_name);
      const details = [
        item.dose,
        frequencyLabel(item.frequency, language),
        item.route,
        item.duration_days ? `${item.duration_days} ${pdfLabel('days', language)}` : undefined,
        item.qty ? `${pdfLabel('qty', language)}: ${item.qty}` : undefined,
      ]
        .filter(Boolean)
        .join('  ·  ');
      font().fontSize(9).text(details);
      // REQ171 -- Drugs.composition, a combination drug's own ingredient
      // breakdown, matching a real reference prescription's own per-item
      // "Composition:" line.
      if (item.composition) {
        font().fontSize(8).fillColor('#555555').text(`${pdfLabel('composition', language)}: ${item.composition}`);
        doc.fillColor('black');
      }
      if (item.instructions) {
        font().fontSize(9).fillColor('#555555').text(item.instructions);
        doc.fillColor('black');
      }
      doc.moveDown(0.5);
    }

    if (ctx?.advice) {
      doc.moveDown(0.5);
      font(true).fontSize(9).text(`${pdfLabel('advice', language)}:`, { continued: true }).font(pdfFontName(doc, language)).text(` ${ctx.advice}`);
    }
    if (ctx?.follow_up) {
      font(true).fontSize(9).text(`${pdfLabel('followUp', language)}:`, { continued: true }).font(pdfFontName(doc, language)).text(` ${ctx.follow_up}`);
    }
    if (ctx?.investigations) {
      font(true).fontSize(9).text(`${pdfLabel('investigations', language)}:`, { continued: true }).font(pdfFontName(doc, language)).text(` ${ctx.investigations}`);
    }

    doc.moveDown(2);
    font().fontSize(9).text('_______________________');
    font(true).text(data.clinician.full_name);
    font().text(pdfLabel('signature', language));
    // REQ129 (US-RX-08) — a short, human-checkable code derived from the
    // prescription's own tamper-evident content hash. A pharmacist/patient
    // can compare this against verifyPrescriptionIntegrity()'s own
    // stored_hash for the same prescription id to confirm the printed
    // drug list matches what was actually signed.
    if (data.prescription.pdf_hash) {
      doc.moveDown(0.5);
      font().fontSize(8).fillColor('#555555').text(`${pdfLabel('verificationCode', language)}: ${formatVerificationCode(data.prescription.pdf_hash)}`);
      doc.fillColor('black');
    }

    // REQ170 -- the letterhead footer band (address/phones/email/website),
    // drawn last so it doesn't interfere with the page-flow layout above;
    // absent entirely when the clinic has none of these fields set.
    drawLetterheadFooter(
      doc,
      {
        address: data.clinic.address,
        email: data.clinic.email,
        website: data.clinic.website,
        phone: data.clinic.contact_phone,
        alternatePhone: data.clinic.alternate_phone,
        appointmentNote: data.clinic.appointment_note,
      },
      language,
      data.clinic.primary_color,
    );
  }

  async prescriptionPdf(id: string, user: JwtPayload): Promise<Buffer> {
    // printPrescription() throws NotFoundException on any access-control
    // failure (wrong org, wrong patient/clinician) -- reused verbatim, not
    // caught and re-thrown, so a PDF download fails exactly the same way
    // the print view already does. It also increments reprint_count as a
    // side effect (an existing, deliberate convention: every render of the
    // print view is itself a "print", and a second one is a reprint) --
    // downloading the PDF counts the same way, matching that behaviour
    // rather than inventing a separate "this doesn't count" exception.
    const data = await this.prescriptionsService.printPrescription(id, user);
    return renderPdfToBuffer((doc) => this.drawPrescriptionPdf(doc, data));
  }

  // REQ109 — the OTP-gated WhatsApp-share retrieval path. verifyShareOtp()
  // throws UnauthorizedException on any failure (expired, wrong code,
  // exhausted attempts) with a message that never distinguishes those
  // cases from "no such prescription" -- reused verbatim, not caught.
  async prescriptionPdfForShare(prescriptionId: string, otp: string): Promise<Buffer> {
    await this.prescriptionsService.verifyShareOtp(prescriptionId, otp);
    const data = await this.prescriptionsService.assembleForShare(prescriptionId);
    return renderPdfToBuffer((doc) => this.drawPrescriptionPdf(doc, data));
  }

  async invoicePdf(id: string, user: JwtPayload): Promise<Buffer> {
    const data = await this.appointmentPaymentsService.invoiceForDownload(id, user);
    if (!data) throw new NotFoundException('Invoice not found');

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, data.clinic.name, data.clinic.contact_phone, data.clinic.logo_url);

      doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${data.invoice_number ?? '—'}`);
      doc.text(`Date: ${formatDate(data.created_at)}`);
      if (data.gst.gstin) doc.text(`GSTIN: ${data.gst.gstin}`);
      if (data.gst.place_of_supply) doc.text(`Place of Supply: ${data.gst.place_of_supply}`);
      doc.moveDown(0.75);

      doc.fontSize(10).font('Helvetica-Bold').text(`Billed to: ${data.patient.full_name}`);
      doc.moveDown(0.75);

      doc.fontSize(10).font('Helvetica-Bold').text('Particulars');
      doc.font('Helvetica').text(data.product_name ?? 'Consultation');
      doc.moveDown(0.5);

      if (data.gst.gst_rate != null) {
        doc.fontSize(9).font('Helvetica');
        doc.text(`GST Rate: ${data.gst.gst_rate}%`);
        if (data.gst.cgst_amount != null) doc.text(`CGST: ${formatMoney(data.gst.cgst_amount)}`);
        if (data.gst.sgst_amount != null) doc.text(`SGST: ${formatMoney(data.gst.sgst_amount)}`);
        if (data.gst.igst_amount != null) doc.text(`IGST: ${formatMoney(data.gst.igst_amount)}`);
        doc.moveDown(0.5);
      }

      doc.fontSize(12).font('Helvetica-Bold').text(`Total Paid: ${formatMoney(data.amount)}`);
      doc.moveDown(0.75);

      if (data.tenders.length) {
        doc.fontSize(9).font('Helvetica-Bold').text('Payment breakdown');
        doc.font('Helvetica');
        for (const t of data.tenders) {
          doc.text(`${t.tender_type.toUpperCase()}: ${formatMoney(t.amount)}${t.reference ? ` (Ref: ${t.reference})` : ''}`);
        }
      }
    });
  }

  async visitSummaryPdf(id: string, user: JwtPayload): Promise<Buffer> {
    // encounter() throws NotFoundException on any access-control failure —
    // reused verbatim, matching prescriptionPdf's own reasoning.
    const encounter = await this.encountersService.encounter(id, user);
    const [patient, clinician, org] = await Promise.all([
      this.prisma.patients.findUnique({ where: { id: (encounter as any).patient_id } }),
      this.prisma.clinicians.findUnique({ where: { id: (encounter as any).clinician_id } }),
      this.prisma.appointments
        .findUnique({ where: { id: (encounter as any).appointment_id }, include: { clinic: { include: { client_organization: true } } } })
        .then((a) => a?.clinic.client_organization ?? null),
    ]);

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, org?.name ?? 'Clinic', org?.contact_phone ?? undefined, org?.logo_url ?? undefined);

      doc.fontSize(14).font('Helvetica-Bold').text('Visit Summary');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Patient: ${patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}`);
      doc.text(`Seen by: ${clinician ? `${clinician.first_name} ${clinician.last_name}` : 'Unknown'}`);
      doc.text(`Date: ${formatDate((encounter as any).created_at)}`);
      doc.moveDown(1);

      const SECTION_LABELS: Record<string, string> = {
        complaints: 'Chief Complaints',
        history: 'History',
        exam: 'Examination',
        vitals: 'Vitals',
        diagnosis: 'Clinical Notes',
        investigations: 'Investigations',
        advice: 'Advice',
        follow_up: 'Follow-up',
      };
      for (const note of (encounter as any).notes as any[]) {
        if (!note.content) continue;
        doc.fontSize(10).font('Helvetica-Bold').text(SECTION_LABELS[note.section] ?? note.section);
        doc.fontSize(9).font('Helvetica').text(htmlToPlainText(note.content));
        doc.moveDown(0.5);
      }

      const diagnoses = (encounter as any).diagnoses as any[];
      if (diagnoses.length) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Diagnoses / Allergies');
        doc.fontSize(9).font('Helvetica');
        for (const d of diagnoses) {
          doc.text(`${d.type === 'allergy' ? 'Allergy' : 'Diagnosis'}: ${d.text}${d.icd10_code ? ` (${d.icd10_code})` : ''} — ${d.status}`);
        }
      }
    });
  }

  // REQ138 (US-INS-06's own follow-on, per REQ131's doc: "a natural
  // follow-on, not bundled here"). A single PDF a claims-desk user can
  // hand to a payer/TPA: the claim's own tracking details plus every
  // prescription REQ137's claimEvidencePrescriptions() already resolves
  // for it — no separate evidence-selection step, matching that story's
  // own "always current, no manual attach" design.
  async reimbursementPackPdf(claimId: string, user: JwtPayload): Promise<Buffer> {
    // InsuranceService#loadClaimForUser (which both calls below reuse)
    // only checks org, not role -- claims()/claim()'s own role gate
    // (staff/manager/admin/super_admin, excluding patient/clinician) is
    // enforced entirely by InsuranceResolver's @Auth decorator, which
    // this REST controller never passes through (its own doc comment:
    // "the global GqlAuthGuard only protects the GraphQL execution
    // context"). Re-asserted here explicitly, matching that same gate,
    // so a patient/clinician JWT can't reach another user's claim data
    // through this route just because GraphQL's own guard doesn't apply.
    if (!user.roles.some((r) => ['staff', 'manager', 'admin', 'super_admin'].includes(r))) {
      throw new ForbiddenException('Not authorized to view claim documents');
    }
    // claim()/claimEvidencePrescriptions() each throw NotFoundException on
    // a cross-org id -- reused verbatim, same reasoning as prescriptionPdf's
    // own comment above. claim() itself is typed nullable (a defensive
    // { nullable: true } on the GraphQL query) but in practice always
    // throws before returning null -- the explicit check below is belt-
    // and-braces, matching invoicePdf's own guard on a nullable result.
    const [claim, prescriptions] = await Promise.all([
      this.insuranceService.claim(claimId, user),
      this.insuranceService.claimEvidencePrescriptions(claimId, user),
    ]);
    if (!claim) throw new NotFoundException('Claim not found');

    const appointment = await this.prisma.appointments.findUnique({
      where: { id: claim.appointment_id },
      include: { clinic: true },
    });

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, appointment?.clinic.name ?? 'Clinic', appointment?.clinic.phone);

      doc.fontSize(14).font('Helvetica-Bold').text('Insurance Reimbursement Pack');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Claim ID: ${claim.id}`);
      doc.text(`Payer: ${claim.payer.name}`);
      doc.text(`Patient: ${claim.patient_name}`);
      doc.text(`Appointment Date: ${formatDate(claim.appointment_date)}`);
      doc.text(`Status: ${claim.status}`);
      doc.text(`Claim Amount: ${formatMoney(claim.claim_amount)}`);
      if (claim.approved_amount != null) doc.text(`Approved Amount: ${formatMoney(claim.approved_amount)}`);
      if (claim.rejection_reason) doc.text(`Rejection Reason: ${claim.rejection_reason}`);
      if (claim.notes) doc.text(`Notes: ${claim.notes}`);
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').text('Supporting Prescriptions');
      doc.moveDown(0.5);
      if (!(prescriptions as any[]).length) {
        doc.fontSize(9).font('Helvetica').fillColor('#555555').text('No prescriptions on file for this claim\'s appointment.');
        doc.fillColor('black');
      }
      for (const rx of prescriptions as any[]) {
        doc.fontSize(10).font('Helvetica-Bold').text(`Prescription — ${formatDate(rx.issued_at)}`);
        doc.fontSize(9).font('Helvetica');
        for (const item of rx.items as any[]) {
          const details = [
            item.dose,
            item.frequency,
            item.route,
            item.duration_days ? `${item.duration_days} days` : undefined,
            item.qty ? `Qty: ${item.qty}` : undefined,
          ]
            .filter(Boolean)
            .join('  ·  ');
          doc.text(`${item.drug_name} — ${details}`);
        }
        doc.moveDown(0.5);
      }
    });
  }

  // P2-03 -- the drafted (or, once a human has reviewed it,
  // human-approved) appeal for a rejected claim, as a PDF a claims-desk
  // user can hand to a payer/TPA. Same explicit role re-check as
  // reimbursementPackPdf above -- this REST controller never passes
  // through GqlAuthGuard/RolesGuard, so InsuranceService#claim()/
  // claimAppeal()'s own org-only access check is not enough on its own.
  async appealPdf(claimId: string, user: JwtPayload): Promise<Buffer> {
    if (!user.roles.some((r) => ['staff', 'manager', 'admin', 'super_admin'].includes(r))) {
      throw new ForbiddenException('Not authorized to view claim documents');
    }
    const [claim, appeal] = await Promise.all([
      this.insuranceService.claim(claimId, user),
      this.insuranceService.claimAppeal(claimId, user),
    ]);
    if (!claim) throw new NotFoundException('Claim not found');
    if (!appeal) throw new NotFoundException('No appeal has been drafted for this claim');

    const appointment = await this.prisma.appointments.findUnique({
      where: { id: claim.appointment_id },
      include: { clinic: true },
    });

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, appointment?.clinic.name ?? 'Clinic', appointment?.clinic.phone);

      doc.fontSize(14).font('Helvetica-Bold').text('Insurance Claim Appeal');
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      doc.text(appeal.status === 'approved' ? 'Status: Approved' : 'Status: Draft — pending review');
      doc.fillColor('black');
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica');
      // draft_content is plain multi-line text (appeal-draft.ts's own
      // '\n'-joined output) -- pdfkit wraps it directly, matching the
      // same free-text rendering visitSummaryPdf's own notes section uses.
      doc.text((appeal as any).draft_content);
    });
  }
}
