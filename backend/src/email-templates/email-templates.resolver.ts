import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { HttpException } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateType, EmailTemplateMutationResultType } from './entities/email-template.entity';
import { UpdateEmailTemplateInput } from './dto/email-template.input';
import { Auth } from '../common/decorators/auth.decorator';

@Resolver()
export class EmailTemplatesResolver {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Query(() => [EmailTemplateType])
  emailTemplates() {
    return this.emailTemplatesService.findAll();
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => EmailTemplateMutationResultType)
  async updateEmailTemplate(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateEmailTemplateInput) {
    try {
      const template = await this.emailTemplatesService.update(id, input);
      return { success: true, userErrors: [], template };
    } catch (err) {
      if (err instanceof HttpException) {
        const response = err.getResponse();
        const message = typeof response === 'string' ? response : (response as any).message;
        const messages = Array.isArray(message) ? message : [message];
        return { success: false, userErrors: messages.map((m: string) => ({ message: m })) };
      }
      throw err;
    }
  }
}
