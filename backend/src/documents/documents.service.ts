import { Injectable, NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { AppointmentPaymentsService } from '../appointment-payments/appointment-payments.service';
import { EncountersService } from '../encounters/encounters.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { renderPdfToBuffer, drawLetterhead } from '../common/pdf/render-pdf';

const formatDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatMoney = (rupees: number) => `₹${rupees.toFixed(2)}`;

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
    private readonly prisma: PrismaService,
  ) {}

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

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, data.clinic.name, data.clinic.contact_phone);

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
    });
  }

  async invoicePdf(id: string, user: JwtPayload): Promise<Buffer> {
    const data = await this.appointmentPaymentsService.invoiceForDownload(id, user);
    if (!data) throw new NotFoundException('Invoice not found');

    return renderPdfToBuffer((doc) => {
      drawLetterhead(doc, data.clinic.name, data.clinic.contact_phone);

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
      drawLetterhead(doc, org?.name ?? 'Clinic', org?.contact_phone ?? undefined);

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
}
