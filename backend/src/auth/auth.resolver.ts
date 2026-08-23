import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
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
  // P3.7 (re-opened F-12): the original @Throttle(5/60s) was removed
  // 2026-08-23 -- it tripped on legitimate rapid manual testing
  // ("ThrottlerException: Too Many Requests (3/5 attempts)") and was the
  // confirmed root cause of the e2e suite's batched-run flakiness (project-
  // plans/06-execution-plan.md P1.5 investigation: --workers=4 still failed
  // 50/66 on this, not browser contention). This redesign raises the limit
  // rather than removing it outright: the real brute-force defense is
  // auth.service.ts's per-account Redis lockout (5 wrong attempts / 15 min,
  // unaffected by this value either way), so this throttle's remaining job
  // is capping request *volume* on the two SMS/email-cost-bearing endpoints
  // and providing DoS headroom on login itself -- not primary credential-
  // stuffing defense, which the lockout already owns. 20/60s is 4x the
  // value that broke both manual testing and e2e; verified live it survives
  // 15 rapid manual-style attempts with room to spare.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => LoginResultType)
  login(@Args('input') input: LoginInput, @Context() context: any) {
    return this.authService.login(input, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => AuthPayloadType)
  verifyTotpLogin(@Args('input') input: VerifyTotpLoginInput, @Context() context: any) {
    return this.authService.verifyTotpLogin(input.challenge_token, input.code, context?.req?.headers?.['user-agent']);
  }

  // P3.7: register never had a throttle at all before this -- the
  // 06-execution-plan.md P3.7 item explicitly names it alongside
  // requestOtp/requestPasswordReset. Only the global 100/60s bucket
  // protected it, which is far too generous for an account-creation
  // endpoint specifically.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

  // Tighter than login/verifyTotpLogin -- a real provider (MSG91/Gupshup)
  // charges per SMS sent once configured, so request *volume* matters here
  // even though the per-account OTP-attempt lockout is a separate control.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Mutation(() => GenericResultType)
  requestOtp(@Args('input') input: RequestOtpInput) {
    return this.authService.requestOtp(input.phone);
  }

  @Public()
  @Mutation(() => AuthPayloadType)
  verifyOtp(@Args('input') input: VerifyOtpInput, @Context() context: any) {
    return this.authService.verifyOtp(input.phone, input.code, context?.req?.headers?.['user-agent']);
  }

  // Same rationale as requestOtp -- a real send (AWS SES) once wired, cost/
  // volume-bearing rather than needing tight brute-force protection.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
