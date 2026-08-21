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

  // TC-AUTH-API-012: rate-limited independent of the per-account lockout in the service.
  // PLAN016 Slice C — returns AuthPayload directly, or TotpChallenge when the
  // account has 2FA enabled (client must then call verifyTotpLogin).
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => LoginResultType)
  login(@Args('input') input: LoginInput, @Context() context: any) {
    return this.authService.login(input, context?.req?.headers?.['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
