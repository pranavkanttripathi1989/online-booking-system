import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ImportsService } from './imports.service';
import { ImportPreviewType, ImportDryRunResultType, ImportCommitResultType } from './entities/imports.entity';
import { ParseImportPreviewInput, DryRunImportInput, CommitImportInput } from './dto/imports.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// P2-05 — bulk patient creation is an administrative action; gated the
// same manager/admin/super_admin set as the other bulk-affecting
// analytics/reports queries, never 'staff'/'clinician'/'patient'.
const IMPORT_ROLES = ['manager', 'admin', 'super_admin'] as const;

@Resolver()
export class ImportsResolver {
  constructor(private readonly importsService: ImportsService) {}

  @Auth(...IMPORT_ROLES)
  @Query(() => ImportPreviewType)
  parseImportPreview(@Args('input') input: ParseImportPreviewInput) {
    return this.importsService.parseImportPreview(input.csvContent);
  }

  @Auth(...IMPORT_ROLES)
  @Query(() => ImportDryRunResultType)
  dryRunImport(@Args('input') input: DryRunImportInput) {
    return this.importsService.dryRunImport(input);
  }

  @Auth(...IMPORT_ROLES)
  @Mutation(() => ImportCommitResultType)
  commitImport(@Args('input') input: CommitImportInput, @CurrentUser() user: JwtPayload) {
    return this.importsService.commitImport(input, user);
  }
}
