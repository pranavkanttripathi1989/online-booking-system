import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { RefreshInput } from './dto/refresh.input';
import { RequestOtpInput, VerifyOtpInput } from './dto/otp.input';
import { ForgotPasswordInput, ResetPasswordInput } from './dto/password-reset.input';
import { VerifyTotpLoginInput } from './dto/totp-login.input';
import { AuthPayloadType, GenericResultType, LoginResultType } from './entities/auth-payload.entity';
import { AuthUserType } from './entities/user.entity';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

// GqlAuthGuard is global (app.module.ts) — every resolver requires a valid JWT
// by default now. Every mutation below that must work for a not-yet-logged-in
// caller is explicitly marked @Public(); everything else needs no annotation
// at all to be protected (fail-closed by default, not fail-open).
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // TC-AUTH-API-012: PLAN016 Slice C — returns AuthPayload directly, or
  // TotpChallenge when the account has 2FA enabled (client must then call
  // verifyTotpLogin).
  //
  // Per-mutation @Throttle(5/60s) removed 2026-08-23 at explicit user
  // request -- it was tripping on legitimate rapid manual testing/dev use
  // ("ThrottlerException: Too Many Requests (3/5 attempts)"), and was the
  // confirmed root cause of the e2e suite's own batched-run flakiness this
  // session (project-plans/06-execution-plan.md P1.5 investigation). The
  // global 100-req/60s bucket (app.module.ts's GqlThrottlerGuard) still
  // applies. Re-adding a *production-appropriate* per-mutation limit here
  // (tighter than global, but not tighter than real usage/e2e needs) is
  // tracked as a re-opened item on F-12 (project-plans/02-findings-register.md)
  // and P3.7 (project-plans/06-execution-plan.md) -- do not silently
  // reintroduce the same 5/60s value without addressing why it broke both.
  @Public()
  @Mutation(() => LoginResultType)
  login(@Args('input') input: LoginInput, @Context() context: any) {
    return this.authService.login(input, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Mutation(() => AuthPayloadType)
  verifyTotpLogin(@Args('input') input: VerifyTotpLoginInput, @Context() context: any) {
    return this.authService.verifyTotpLogin(input.challenge_token, input.code, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Mutation(() => AuthPayloadType)
  register(@Args('input') input: RegisterInput, @Context() context: any) {
    return this.authService.register(input, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Mutation(() => AuthPayloadType)
  refresh(@Args('input') input: RefreshInput, @Context() context: any) {
    return this.authService.refresh(input, context?.req?.headers?.['user-agent']);
  }

  // LOGOUT_MUTATION (frontend/src/graphql/mutations.js) has no sub-selection
  // ("{ logout }"), so this field must resolve to a scalar, not an object type.
  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: JwtPayload) {
    const result = await this.authService.logout(user.sub);
    return result.success;
  }

  @Query(() => AuthUserType)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @Public()
  @Mutation(() => GenericResultType)
  requestOtp(@Args('input') input: RequestOtpInput) {
    return this.authService.requestOtp(input.phone);
  }

  @Public()
  @Mutation(() => AuthPayloadType)
  verifyOtp(@Args('input') input: VerifyOtpInput, @Context() context: any) {
    return this.authService.verifyOtp(input.phone, input.code, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Mutation(() => GenericResultType)
  forgotPassword(@Args('input') input: ForgotPasswordInput) {
    return this.authService.forgotPassword(input.email);
  }

  @Public()
  @Mutation(() => GenericResultType)
  resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.authService.resetPassword(input.token, input.new_password);
  }
}
