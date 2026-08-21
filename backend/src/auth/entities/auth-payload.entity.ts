import { ObjectType, Field, Int, createUnionType } from '@nestjs/graphql';
import { AuthUserType } from './user.entity';

// TC-AUTH-API-001: field names here are a hard contract — AuthContext.jsx
// destructures access_token/token_type/expires_in/user exactly as named.
// Every field stays required -- a 2FA-enabled account doesn't get a
// half-filled AuthPayload, it gets a TotpChallengeType instead (see the
// LoginResult union below), so this shape is never asked to represent
// "logged in, but not really yet".
@ObjectType('AuthPayload')
export class AuthPayloadType {
  @Field()
  access_token: string;

  @Field()
  refresh_token: string;

  @Field()
  token_type: string;

  @Field(() => Int)
  expires_in: number;

  @Field(() => AuthUserType)
  user: AuthUserType;

  // REQ012/PLAN021 — true when this org's "Require MFA for all staff"
  // security setting is on, the caller's role isn't patient, and they
  // haven't enrolled in TOTP yet. Login still succeeds (a user who can't
  // log in at all has no way to reach the 2FA enrollment screen, which
  // itself requires being logged in) -- the frontend redirects straight to
  // enrollment instead of the normal post-login destination. Always
  // present (false, not omitted) for every other case, matching this
  // type's existing no-half-filled-shape contract.
  @Field()
  mfa_setup_required: boolean;

  // REQ012/PLAN021 — the org's "Auto-logout after idle" setting, read once
  // by the frontend right after login to drive a real client-side
  // inactivity timer. Exposed here (not a separate manager-only query)
  // because every authenticated role needs it, not just managers who can
  // see the Security settings page itself.
  @Field(() => Int, { nullable: true })
  session_timeout_minutes?: number;
}

// PLAN016 Slice C — returned by `login` instead of AuthPayloadType when the
// account has 2FA enabled. challenge_token is short-lived (5 min) and only
// usable by verifyTotpLogin, never a real session credential itself.
@ObjectType('TotpChallenge')
export class TotpChallengeType {
  @Field()
  requires_totp: boolean;

  @Field()
  challenge_token: string;
}

export const LoginResultType = createUnionType({
  name: 'LoginResult',
  types: () => [AuthPayloadType, TotpChallengeType] as const,
  resolveType(value: AuthPayloadType | TotpChallengeType) {
    return 'challenge_token' in value ? TotpChallengeType : AuthPayloadType;
  },
});

@ObjectType('GenericResult')
export class GenericResultType {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;
}
