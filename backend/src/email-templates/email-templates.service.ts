import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailTemplateInput } from './dto/email-template.input';

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(template: any) {
    const { template_type, ...rest } = template;
    return { ...rest, type: template_type };
  }

  async findAll() {
    const rows = await this.prisma.emailTemplates.findMany({ where: { is_deleted: false }, orderBy: { name: 'asc' } });
    return rows.map((r) => this.toGraphQL(r));
  }

  // TC-ADMIN-UNIT-004: extract {{var}} tokens only (not any other brace-like syntax).
  private extractTokens(text: string): string[] {
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
    return matches.map((m) => m.replace(/[{}]/g, '').trim());
  }

  async update(id: string, input: UpdateEmailTemplateInput) {
    const existing = await this.prisma.emailTemplates.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Email template not found');
    }

    // TC-ADMIN-API-009: reject a subject/body using a {{token}} outside this
    // template's allowed `variables` set — a typo'd token would otherwise
    // silently render literally in a sent email.
    const usedTokens = new Set([...this.extractTokens(input.subject), ...this.extractTokens(input.body)]);
    const allowed = new Set(existing.variables);
    const invalid = [...usedTokens].filter((t) => !allowed.has(t));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown template variable(s): ${invalid.map((t) => `{{${t}}}`).join(', ')}. Allowed: ${existing.variables.map((v) => `{{${v}}}`).join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.emailTemplates.update({
      where: { id },
      data: { subject: input.subject, body: input.body },
    });
    return this.toGraphQL(updated);
  }
}
