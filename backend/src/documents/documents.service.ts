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
import { renderPdfToBuffer, drawLetterhead } from '../common/pdf/render-pdf';

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
    drawLetterhead(doc, data.clinic.name, data.clinic.contact_phone, data.clinic.logo_url);

    doc.fontSize(11).font('Helvetica-Bold').text(data.clinician.full_name);
    doc.fontSize(9).font('Helvetica');
    if (data.clinician.qualifications) doc.text(data.clinician.qualifications);
    if (data.clinician.registration_number) doc.text(`Reg. No: ${data.clinician.registration_number}`);
    doc.moveDown(0.75);

    doc.fontSize(11).font('Helvetica-Bold').text(`Patient: ${data.patient.full_name}`);
    doc.fontSize(9).font('Helvetica');
    const patientLine = [
      data.patient.date_of_birth ? `DOB: ${formatDate(data.patient.date_of_birth)}` : undefined,
      data.patient.gender ? `Gender: ${data.patient.gender}` : undefined,
    ]
      .filter(Boolean)
      .join('   ');
    if (patientLine) doc.text(patientLine);
    doc.text(`Date: ${formatDate(data.prescription.issued_at)}`);
    doc.moveDown(1);

    if (data.is_reprint) {
      doc.save();
      doc.rotate(-30, { origin: [297, 420] });
      doc.fontSize(60).fillColor('#dddddd').font('Helvetica-Bold').text('DUPLICATE', 130, 390, { lineBreak: false });
      doc.restore();
      doc.fillColor('black');
    }

    doc.fontSize(14).font('Helvetica-Bold').text('℞');
    doc.moveDown(0.5);
    for (const item of data.prescription.items as any[]) {
      doc.fontSize(10).font('Helvetica-Bold').text(item.drug_name);
      const details = [
        item.dose,
        item.frequency,
        item.route,
        item.duration_days ? `${item.duration_days} days` : undefined,
        item.qty ? `Qty: ${item.qty}` : undefined,
      ]
        .filter(Boolean)
        .join('  ·  ');
      doc.fontSize(9).font('Helvetica').text(details);
      if (item.instructions) {
        doc.fontSize(9).fillColor('#555555').text(item.instructions);
        doc.fillColor('black');
      }
      doc.moveDown(0.5);
    }

    doc.moveDown(2);
    doc.fontSize(9).text('_______________________');
    doc.text('Signature');
    // REQ129 (US-RX-08) — a short, human-checkable code derived from the
    // prescription's own tamper-evident content hash. A pharmacist/patient
    // can compare this against verifyPrescriptionIntegrity()'s own
    // stored_hash for the same prescription id to confirm the printed
    // drug list matches what was actually signed.
    if (data.prescription.pdf_hash) {
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#555555').text(`Verification code: ${formatVerificationCode(data.prescription.pdf_hash)}`);
      doc.fillColor('black');
    }
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
        doc.fontSize(9).font('Helvetica').text(note.content);
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
}
