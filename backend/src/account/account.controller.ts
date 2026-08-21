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
import { AccountService } from './account.service';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // matches the frontend's existing "Max 2MB" copy
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

// Magic-byte signatures, not the client-declared Content-Type -- a renamed
// .exe with "image/jpeg" set by the uploader must not pass (requirements/
// security-requirements.md §4).
const SIGNATURES: { ext: string; mime: string; check: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'gif', mime: 'image/gif', check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
];

// REQ005/PLAN016 Slice B — plain REST endpoint, not a GraphQL upload scalar.
// The global GqlAuthGuard reads exclusively from GraphQL execution context
// (see gql-auth.guard.ts's getRequest()), so it can't protect a REST route
// correctly -- this controller verifies the bearer token itself via
// JwtService instead, rather than fighting that guard's assumptions.
//
// Local filesystem storage, not S3: no AWS credentials exist anywhere in
// this environment (confirmed: no @aws-sdk/* dependency, no AWS env vars) --
// building against a real S3 bucket without them would mean fabricating the
// integration. To move this to S3 ap-south-1 once credentials exist: swap
// the fs.writeFileSync call below for an S3 PutObjectCommand and return the
// bucket URL instead of the local /uploads/ path -- everything else
// (validation, the avatar_url column, the frontend call site) stays as-is.
@Controller('account')
export class AccountController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
  ) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();
    let userId: string;
    try {
      const payload = await this.jwtService.verifyAsync(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_SIZE_BYTES) throw new BadRequestException('File must be under 2 MB');

    const signature = SIGNATURES.find((s) => s.check(file.buffer));
    if (!signature) throw new BadRequestException('File must be a JPEG, PNG, or GIF image');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${userId}-${crypto.randomUUID()}.${signature.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);

    const url = `/uploads/avatars/${filename}`;
    await this.accountService.setMyAvatarUrl(url, userId);
    return { url };
  }
}
