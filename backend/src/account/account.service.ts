import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateMyProfileInput, ChangeMyPasswordInput } from './dto/account.input';

const BCRYPT_COST = 12;

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly authService: AuthService,
  ) {}

  // Same key format as AuthService's private userRefreshSetKey() (auth.service.ts)
  // -- deliberately duplicated rather than exported, to avoid widening
  // AuthService's surface for two one-line string builders.
  private userRefreshSetKey(userId: string) {
    return `auth:user:${userId}:refresh_tokens`;
  }

  private refreshMetaKey(token: string) {
    return `auth:refresh_meta:${token}`;
  }

  private sessionFingerprint(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }

  private toProfile(row: any) {
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone ?? undefined,
    };
  }

  async myProfile(user: JwtPayload) {
    const profile = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    if (!profile || profile.is_deleted) return null;
    return this.toProfile(profile);
  }

  async updateMyProfile(input: UpdateMyProfileInput, user: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Profile not found' }] };
    }
    if (input.phone && input.phone !== existing.phone) {
      const phoneOwner = await this.prisma.userProfiles.findUnique({ where: { phone: input.phone } });
      if (phoneOwner && phoneOwner.id !== user.sub) {
        return { success: false, userErrors: [{ message: 'That phone number is already in use' }] };
      }
    }
    try {
      const row = await this.prisma.userProfiles.update({
        where: { id: user.sub },
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
        },
      });
      return { success: true, userErrors: [], profile: this.toProfile(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update profile' }] };
    }
  }

  async changeMyPassword(input: ChangeMyPasswordInput, user: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    if (!existing || existing.is_deleted) {
      return { success: false, message: 'Profile not found' };
    }
    const matches = await bcrypt.compare(input.current_password, existing.password);
    if (!matches) {
      return { success: false, message: 'Current password is incorrect' };
    }
    const hashed = await bcrypt.hash(input.new_password, BCRYPT_COST);
    await this.prisma.userProfiles.update({ where: { id: user.sub }, data: { password: hashed } });
    return { success: true };
  }

  async mySessions(user: JwtPayload) {
    const tokens = await this.redis.smembers(this.userRefreshSetKey(user.sub));
    const sessions = await Promise.all(
      tokens.map(async (token) => {
        const raw = await this.redis.get(this.refreshMetaKey(token));
        const meta = raw ? JSON.parse(raw) : null;
        return {
          id: this.sessionFingerprint(token),
          device: meta?.user_agent ?? undefined,
          created_at: meta?.created_at ? new Date(meta.created_at) : undefined,
        };
      }),
    );
    return sessions;
  }

  async revokeMySession(id: string, user: JwtPayload) {
    const setKey = this.userRefreshSetKey(user.sub);
    const tokens = await this.redis.smembers(setKey);
    const match = tokens.find((token) => this.sessionFingerprint(token) === id);
    if (!match) {
      return { success: false, message: 'Session not found' };
    }
    await this.redis.del(`auth:refresh:${match}`, this.refreshMetaKey(match));
    await this.redis.srem(setKey, match);
    return { success: true };
  }

  async deactivateMyAccount(user: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id: user.sub } });
    if (!existing || existing.is_deleted) {
      return { success: false, message: 'Profile not found' };
    }
    await this.prisma.userProfiles.update({ where: { id: user.sub }, data: { is_active: false } });
    await this.authService.logout(user.sub);
    return { success: true };
  }
}
