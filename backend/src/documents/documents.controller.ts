import { Controller, Get, Post, Body, Param, Req, Res, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ057 (US-PAT-02) — plain REST endpoints, same reasoning as
// org-branding.controller.ts/account.controller.ts's own upload routes:
// the global GqlAuthGuard only protects the GraphQL execution context, so
// this controller verifies the bearer token itself. A PDF download is a
// binary response (Content-Type: application/pdf), which a GraphQL query
// cannot express — this is why the download itself is REST while every
// other resolver in this codebase stays GraphQL, not a style choice.
//
// No new tenancy-matrix coverage: matrix-coverage.int-spec.ts's own
// domain-cases.ts only ever runs GraphQL queries (confirmed against
// AttachmentsController/OrgBrandingController, both also uncovered by it
// for the same structural reason) — cross-tenant isolation here is
// entirely delegated to the three underlying services' own already-tested
// org/self-scoping (printPrescription, invoiceForDownload, encounter),
// each of which throws/returns-null on a cross-tenant or cross-patient id
// before this controller ever touches pdfkit.
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly jwtService: JwtService,
  ) {}

  private async authenticate(req: Request): Promise<JwtPayload> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('prescriptions/:id/pdf')
  async prescriptionPdf(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = await this.authenticate(req);
    const buffer = await this.documentsService.prescriptionPdf(id, user);
    this.sendPdf(res, buffer, `prescription-${id}.pdf`);
  }

  @Get('invoices/:id/pdf')
  async invoicePdf(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = await this.authenticate(req);
    const buffer = await this.documentsService.invoicePdf(id, user);
    this.sendPdf(res, buffer, `invoice-${id}.pdf`);
  }

  @Get('visit-summaries/:id/pdf')
  async visitSummaryPdf(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = await this.authenticate(req);
    const buffer = await this.documentsService.visitSummaryPdf(id, user);
    this.sendPdf(res, buffer, `visit-summary-${id}.pdf`);
  }

  // REQ138 (US-INS-06's own follow-on)
  @Get('claims/:id/reimbursement-pack/pdf')
  async reimbursementPackPdf(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const user = await this.authenticate(req);
    const buffer = await this.documentsService.reimbursementPackPdf(id, user);
    this.sendPdf(res, buffer, `reimbursement-pack-${id}.pdf`);
  }

  // REQ109 — genuinely public: no Bearer token, no `authenticate()` call.
  // The signed link token + OTP together ARE the access control (the
  // prescriptionId is never a client-supplied URL/body id -- it's derived
  // server-side from the token's own verified claims, so a caller can
  // never probe a prescription id they don't already hold a valid link
  // for).
  @Post('prescriptions/share-verify')
  async verifyPrescriptionShare(@Body() body: { token?: string; otp?: string }, @Res() res: Response) {
    if (!body.token || !body.otp) throw new UnauthorizedException('Missing token or code');
    let claims: { purpose: string; prescriptionId: string };
    try {
      claims = await this.jwtService.verifyAsync(body.token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('This link has expired or is invalid');
    }
    // Must match prescriptions.service.ts's own RX_SHARE_PURPOSE literally
    // -- not imported, since that file has no exported constant for it
    // (same "each file re-declares its own JWT purpose string" shape as
    // auth.service.ts's own TOTP_CHALLENGE_PURPOSE).
    if (claims.purpose !== 'rx_share' || !claims.prescriptionId) {
      throw new UnauthorizedException('Invalid link');
    }
    const buffer = await this.documentsService.prescriptionPdfForShare(claims.prescriptionId, body.otp);
    this.sendPdf(res, buffer, `prescription-${claims.prescriptionId}.pdf`);
  }
}
