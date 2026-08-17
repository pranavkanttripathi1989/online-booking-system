import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { HttpException } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { LanguageType } from './entities/language.entity';
import { LookupMutationResultType } from '../lookups/entities/lookup-mutation-result.entity';
import { CreateLanguageInput, UpdateLanguageInput } from './dto/language.input';
import { Auth } from '../common/decorators/auth.decorator';

// admin/Languages.jsx expects {success, userErrors} — same wrapper already
// established for Reference Data (lookups module); reused here rather than
// redefined (context/backend-hard-rules.md Rule 9 + avoiding a duplicate type).
function toResult(fn: () => Promise<unknown>) {
  return fn()
    .then(() => ({ success: true, userErrors: [] }))
    .catch((err) => {
      if (err instanceof HttpException) {
        const response = err.getResponse();
        const message = typeof response === 'string' ? response : (response as any).message;
        const messages = Array.isArray(message) ? message : [message];
        return { success: false, userErrors: messages.map((m: string) => ({ message: m })) };
      }
      throw err;
    });
}

@Resolver()
export class LanguagesResolver {
  constructor(private readonly languagesService: LanguagesService) {}

  @Query(() => [LanguageType])
  languages() {
    return this.languagesService.findAll();
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  createLanguage(@Args('input') input: CreateLanguageInput) {
    return toResult(() => this.languagesService.create(input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  updateLanguage(@Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateLanguageInput) {
    return toResult(() => this.languagesService.update(id, input));
  }

  @Auth('admin', 'super_admin')
  @Mutation(() => LookupMutationResultType)
  deleteLanguage(@Args('id', { type: () => ID }) id: string) {
    return toResult(() => this.languagesService.remove(id));
  }
}
