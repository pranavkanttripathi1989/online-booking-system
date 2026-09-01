import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_COOKIE_NAME } from '../auth/auth-cookies.util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // scanned lab reports run larger than a 2MB avatar/logo
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'patient-documents');
// REQ174 — deliberately narrower than orderTest's own role list: 'staff'
// can view a patient's documents (see patient-documents.resolver.ts's own
// read gate) but not upload one, per the requirement's own explicit list.
const UPLOAD_ROLES = ['admin', 'manager', 'clinician'];

// REQ174 -- mirrors backend/src/encounters/attachments.controller.ts's
// established pattern exactly (this is now the third instance of it,
// after encounter attachments and message attachments): the global
// GqlAuthGuard only covers the GraphQL execution context, so this REST
// controller verifies its own bearer token, then a separate GraphQL
// mutation (createPatientDocument) persists the metadata row and does the
// real patient/org access check.
const SIGNATURES: { ext: string; mime: string; check: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: 'pdf',
    mime: 'application/pdf',
    check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // "%PDF"
  },
];

@Controller('patient-documents')
export class PatientDocumentsController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[ACCESS_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = cookieToken ?? headerToken;
    if (!token) throw new UnauthorizedException();
    let payload: { sub: string; client_org_id?: string | null; roles?: string[] };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.roles?.some((r) => UPLOAD_ROLES.includes(r))) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('File must be under 10 MB');

    const signature = SIGNATURES.find((s) => s.check(file.buffer));
    if (!signature) throw new BadRequestException('File must be a PNG, JPEG, or PDF');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${payload.sub}-${crypto.randomUUID()}.${signature.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);

    return { file_ref: `/uploads/patient-documents/${filename}`, mime_type: signature.mime };
  }
}
