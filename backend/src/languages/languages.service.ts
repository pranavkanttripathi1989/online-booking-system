import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanguageInput, UpdateLanguageInput } from './dto/language.input';

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.languages.findMany({ where: { is_deleted: false }, orderBy: { name: 'asc' } });
  }

  private async assertUnique(field: 'name' | 'code', value: string, excludeId?: string) {
    const rows = await this.prisma.languages.findMany({ where: { [field]: { equals: value, mode: 'insensitive' } } });
    if (rows.some((r) => r.id !== excludeId)) {
      throw new ConflictException(`"${value}" already exists (case-insensitive match)`);
    }
  }

  // TC-ADMIN-UNIT-010/API-014: exactly one default at any point queryable —
  // clearing the old default and setting the new one happen in one transaction.
  private async setAsDefault(tx: any, id: string) {
    await tx.languages.updateMany({ where: { is_default: true, NOT: { id } }, data: { is_default: false } });
    await tx.languages.update({ where: { id }, data: { is_default: true } });
  }

  async create(input: CreateLanguageInput) {
    await this.assertUnique('name', input.name);
    await this.assertUnique('code', input.code);
    return this.prisma.$transaction(async (tx) => {
      const lang = await tx.languages.create({
        data: { name: input.name, code: input.code, is_active: input.is_active ?? true, is_default: false },
      });
      if (input.is_default) {
        await this.setAsDefault(tx, lang.id);
        return tx.languages.findUniqueOrThrow({ where: { id: lang.id } });
      }
      return lang;
    });
  }

  async update(id: string, input: UpdateLanguageInput) {
    const existing = await this.prisma.languages.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Language not found');
    }
    if (input.name) await this.assertUnique('name', input.name, id);
    if (input.code) await this.assertUnique('code', input.code, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.languages.update({
        where: { id },
        data: { name: input.name, code: input.code, is_active: input.is_active },
      });
      if (input.is_default) {
        await this.setAsDefault(tx, id);
        return tx.languages.findUniqueOrThrow({ where: { id } });
      }
      return updated;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.languages.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Language not found');
    }
    if (existing.is_default) {
      throw new ConflictException('Cannot delete the default language — set another language as default first');
    }
    await this.prisma.languages.update({ where: { id }, data: { is_deleted: true, is_active: false } });
    return true;
  }
}
