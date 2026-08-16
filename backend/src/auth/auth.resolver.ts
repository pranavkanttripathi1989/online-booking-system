import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { RefreshInput } from './dto/refresh.input';
import { RequestOtpInput, VerifyOtpInput } from './dto/otp.input';
import { ForgotPasswordInput, ResetPasswordInput } from './dto/password-reset.input';
import { AuthPayloadType, GenericResultType } from './entities/auth-payload.entity';
import { AuthUserType } from './entities/user.entity';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // TC-AUTH-API-012: rate-limited independent of the per-account lockout in the service.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => AuthPayloadType)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  @Mutation(() => AuthPayloadType)
  register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayloadType)
  refresh(@Args('input') input: RefreshInput) {
    return this.authService.refresh(input);
  }

  // LOGOUT_MUTATION (frontend/src/graphql/mutations.js) has no sub-selection
  // ("{ logout }"), so this field must resolve to a scalar, not an object type.
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: JwtPayload) {
    const result = await this.authService.logout(user.sub);
    return result.success;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => AuthUserType)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => GenericResultType)
  requestOtp(@Args('input') input: RequestOtpInput) {
    return this.authService.requestOtp(input.phone);
  }

  @Mutation(() => AuthPayloadType)
  verifyOtp(@Args('input') input: VerifyOtpInput) {
    return this.authService.verifyOtp(input.phone, input.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Mutation(() => GenericResultType)
  forgotPassword(@Args('input') input: ForgotPasswordInput) {
    return this.authService.forgotPassword(input.email);
  }

  @Mutation(() => GenericResultType)
  resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.authService.resetPassword(input.token, input.new_password);
  }
}
