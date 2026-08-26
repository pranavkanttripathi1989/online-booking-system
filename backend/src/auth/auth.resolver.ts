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
import { ImpersonationResultType, EndImpersonationResultType } from './entities/impersonation.entity';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Auth } from '../common/decorators/auth.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { setAccessCookie, setRefreshCookie, clearAuthCookies, REFRESH_COOKIE_NAME } from './auth-cookies.util';

// P1-02/SEC-2 — the web session now lives in an httpOnly cookie, set here
// from context.res (app.module.ts's GraphQL context factory exposes it
// alongside req, HTTP-path only). context.res is undefined for anything
// reached over the WS subscription transport, so every call site below
// guards on its presence rather than assuming it — no mutation here is
// ever invoked over WS, but failing soft instead of throwing keeps this
// resolver correct even if that ever changed.
function applySessionCookies(context: any, tokens: { access_token?: string; refresh_token?: string; expires_in?: number }): void {
  const res = context?.res;
  if (!res || !tokens) return;
  if (tokens.access_token) setAccessCookie(res, tokens.access_token, tokens.expires_in);
  if (tokens.refresh_token) setRefreshCookie(res, tokens.refresh_token);
}

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
  async login(@Args('input') input: LoginInput, @Context() context: any) {
    const result = await this.authService.login(input, context?.req?.headers?.['user-agent']);
    // TotpChallengeType has no access_token — 2FA isn't complete yet, so no
    // session cookie is set until verifyTotpLogin succeeds.
    if ('access_token' in result) applySessionCookies(context, result);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Mutation(() => AuthPayloadType)
  async verifyTotpLogin(@Args('input') input: VerifyTotpLoginInput, @Context() context: any) {
    const result = await this.authService.verifyTotpLogin(input.challenge_token, input.code, context?.req?.headers?.['user-agent']);
    applySessionCookies(context, result);
    return result;
  }

  // P3.7: register never had a throttle at all before this -- the
  // 06-execution-plan.md P3.7 item explicitly names it alongside
  // requestOtp/requestPasswordReset. Only the global 100/60s bucket
  // protected it, which is far too generous for an account-creation
  // endpoint specifically.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Mutation(() => AuthPayloadType)
  async register(@Args('input') input: RegisterInput, @Context() context: any) {
    const result = await this.authService.register(input, context?.req?.headers?.['user-agent']);
    applySessionCookies(context, result);
    return result;
  }

  // P1-02/SEC-2 — the frontend calls this with an empty input ({}) and
  // relies entirely on the mb_refresh_token cookie (apollo/client.js's
  // silent-refresh-on-401): the refresh token itself was never a
  // JS-readable value to begin with, so there's nothing for the frontend
  // to have passed explicitly. A caller that does supply input.refresh_token
  // is still honoured (e.g. a non-browser API caller with no cookie jar).
  @Public()
  @Mutation(() => AuthPayloadType)
  async refresh(@Args('input') input: RefreshInput, @Context() context: any) {
    const token = input.refresh_token || context?.req?.cookies?.[REFRESH_COOKIE_NAME];
    const result = await this.authService.refresh({ refresh_token: token }, context?.req?.headers?.['user-agent']);
    applySessionCookies(context, result);
    return result;
  }

  // LOGOUT_MUTATION (frontend/src/graphql/mutations.js) has no sub-selection
  // ("{ logout }"), so this field must resolve to a scalar, not an object type.
  @Mutation(() => Boolean)
  async logout(@CurrentUser() user: JwtPayload, @Context() context: any) {
    const result = await this.authService.logout(user.sub);
    if (context?.res) clearAuthCookies(context.res);
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
  async verifyOtp(@Args('input') input: VerifyOtpInput, @Context() context: any) {
    const result = await this.authService.verifyOtp(input.phone, input.code, context?.req?.headers?.['user-agent']);
    applySessionCookies(context, result);
    return result;
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

  // REQ053 (US-SEC-06) — mints a time-boxed access token acting as the
  // target user; every write made with it is attributed to the real actor
  // in the audit log (AuditLogInterceptor reads real_actor_id).
  @Auth('admin', 'super_admin')
  @Mutation(() => ImpersonationResultType)
  async startImpersonation(
    @Args('target_user_id') targetUserId: string,
    @Args('reason') reason: string,
    @CurrentUser() user: JwtPayload,
    @Context() context: any,
  ) {
    const result = await this.authService.startImpersonation(user, targetUserId, reason);
    // Overwrites the real actor's own access-token cookie with the
    // impersonation one. The refresh-token cookie is deliberately left
    // untouched — endImpersonation below reuses it (via issueTokens on the
    // real actor's profile) to hand back a real session, so it must still
    // be the real actor's the whole time impersonation is active.
    if (result.success && result.access_token) {
      applySessionCookies(context, { access_token: result.access_token, expires_in: result.expires_in });
    }
    return result;
  }

  @Mutation(() => EndImpersonationResultType)
  async endImpersonation(@CurrentUser() user: JwtPayload, @Context() context: any) {
    const result: any = await this.authService.endImpersonation(user);
    if (result.success && result._tokens) {
      applySessionCookies(context, result._tokens);
    }
    const { _tokens, ...publicResult } = result;
    return publicResult;
  }
}
