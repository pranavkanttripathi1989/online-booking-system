import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AccountService } from './account.service';
import {
  MyProfileType,
  MyProfileMutationResultType,
  SessionType,
  TotpEnrollmentType,
  TotpConfirmResultType,
} from './entities/account.entity';
import {
  UpdateMyProfileInput,
  ChangeMyPasswordInput,
  ConfirmTotpEnrollmentInput,
  DisableTotpInput,
} from './dto/account.input';
import { GenericResultType } from '../auth/entities/auth-payload.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// No @Auth(role) on anything here -- every operation is self-scoped off the
// caller's own JWT (@CurrentUser(), never a client-supplied user id), so the
// global GqlAuthGuard alone is sufficient (matches auth.resolver.ts's `me`/
// `logout`, which have no role gating either).
@Resolver()
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Query(() => MyProfileType, { name: 'myProfile', nullable: true })
  myProfile(@CurrentUser() user: JwtPayload) {
    return this.accountService.myProfile(user);
  }

  @Mutation(() => MyProfileMutationResultType, { name: 'updateMyProfile' })
  updateMyProfile(@Args('input') input: UpdateMyProfileInput, @CurrentUser() user: JwtPayload) {
    return this.accountService.updateMyProfile(input, user);
  }

  @Mutation(() => GenericResultType, { name: 'changeMyPassword' })
  changeMyPassword(@Args('input') input: ChangeMyPasswordInput, @CurrentUser() user: JwtPayload) {
    return this.accountService.changeMyPassword(input, user);
  }

  @Query(() => [SessionType], { name: 'mySessions' })
  mySessions(@CurrentUser() user: JwtPayload) {
    return this.accountService.mySessions(user);
  }

  @Mutation(() => GenericResultType, { name: 'revokeMySession' })
  revokeMySession(@Args('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.accountService.revokeMySession(id, user);
  }

  @Mutation(() => GenericResultType, { name: 'deactivateMyAccount' })
  deactivateMyAccount(@CurrentUser() user: JwtPayload) {
    return this.accountService.deactivateMyAccount(user);
  }

  @Mutation(() => TotpEnrollmentType, { name: 'startTotpEnrollment' })
  startTotpEnrollment(@CurrentUser() user: JwtPayload) {
    return this.accountService.startTotpEnrollment(user);
  }

  @Mutation(() => TotpConfirmResultType, { name: 'confirmTotpEnrollment' })
  confirmTotpEnrollment(@Args('input') input: ConfirmTotpEnrollmentInput, @CurrentUser() user: JwtPayload) {
    return this.accountService.confirmTotpEnrollment(input.code, user);
  }

  @Mutation(() => GenericResultType, { name: 'disableTotp' })
  disableTotp(@Args('input') input: DisableTotpInput, @CurrentUser() user: JwtPayload) {
    return this.accountService.disableTotp(input.password, user);
  }

  // REQ012/PLAN021 Slice 4 — GDPR Art.20 data export, gated by the
  // patient's own org's patient_data_export_enabled setting. A JSON string
  // (not a dedicated type) matching this codebase's existing
  // AuditLogs.details precedent, rather than introducing a new generic-JSON
  // scalar for a single field.
  @Query(() => String, { name: 'myDataExport', nullable: true })
  myDataExport(@CurrentUser() user: JwtPayload) {
    return this.accountService.myDataExport(user);
  }
}
