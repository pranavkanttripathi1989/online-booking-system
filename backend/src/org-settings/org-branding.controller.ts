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

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches the frontend's "Max 2MB" copy
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'branding');

// REQ002/PLAN022 — plain REST endpoint, same reasoning as account.controller.ts's
// avatar upload: the global GqlAuthGuard only protects GraphQL execution
// context, so this controller verifies the bearer token itself.
//
// PNG/JPEG only, deliberately not SVG despite the requirement doc's "SVG or
// PNG" placeholder copy: SVG is XML that can embed <script>/event-handler
// payloads, and this logo is served back to every visitor of the org's
// booking page (including patients) -- accepting it without a real
// sanitization pass (no such library exists in this environment) would be a
// stored-XSS vector. See PLAN022.
//
// Local filesystem storage, not S3: no AWS credentials exist anywhere in
// this environment (same documented gap as account.controller.ts's avatar
// upload) -- swap the fs.writeFileSync call for an S3 PutObjectCommand once
// real ap-south-1 credentials exist.
const SIGNATURES: { ext: string; mime: string; check: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
];

@Controller('org-branding')
export class OrgBrandingController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    // P1-02/SEC-2 -- httpOnly session cookie checked first (matches documents.controller.ts's
    // own precedent); Bearer header stays as a fallback for any non-browser caller.
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

    // Only a caller with an org can set that org's public logo -- an
    // org-less admin/super_admin has no single tenant's branding to edit.
    if (!payload.client_org_id) {
      throw new ForbiddenException("Your account isn't linked to an organization");
    }
    if (!payload.roles?.some((r) => ['manager', 'admin', 'super_admin'].includes(r))) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('File must be under 2 MB');

    const signature = SIGNATURES.find((s) => s.check(file.buffer));
    if (!signature) throw new BadRequestException('File must be a PNG or JPEG image');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${payload.client_org_id}-${crypto.randomUUID()}.${signature.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);

    return { url: `/uploads/branding/${filename}` };
  }
}
