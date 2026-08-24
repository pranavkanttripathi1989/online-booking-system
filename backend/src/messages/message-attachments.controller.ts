import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // matches encounters/attachments.controller.ts's own limit
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'message-attachments');

// REQ058 (US-MSG-01) -- plain REST endpoint mirroring
// encounters/attachments.controller.ts's own pattern exactly (multer
// in-memory, magic-byte signature allow-list, manual bearer verify since
// the global GqlAuthGuard only protects the GraphQL execution context).
// No role check here, unlike that controller's clinician-only gate --
// any authenticated staff member can attach a file to a message they're
// about to send; the GraphQL createMessageAttachment mutation that
// persists the DB row is where the real access check lives (caller must
// already be a participant of the target message's thread), matching the
// same two-step upload-then-persist split.
const SIGNATURES: { ext: string; mime: string; check: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'pdf', mime: 'application/pdf', check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
];

@Controller('message-attachments')
export class MessageAttachmentsController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('File must be under 10 MB');

    const signature = SIGNATURES.find((s) => s.check(file.buffer));
    if (!signature) throw new BadRequestException('File must be a PNG, JPEG, or PDF');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${payload.sub}-${crypto.randomUUID()}.${signature.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);

    return { file_ref: `/uploads/message-attachments/${filename}`, mime_type: signature.mime };
  }
}
