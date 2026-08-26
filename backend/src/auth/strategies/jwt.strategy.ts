import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE_NAME } from '../auth-cookies.util';

// P1-02/SEC-2 — the real web session now arrives as an httpOnly cookie
// (never readable by frontend JS), checked first. The Bearer header stays
// as a fallback, unchanged, for the two callers that were never in scope
// for this slice's cookie migration: documents.controller.ts's REST
// endpoints (a plain <a> download can't be made to carry a cookie the way
// a fetch() with credentials:'include' can, and its own bearer auth
// predates this slice) and the WS subscription path (app.module.ts's
// context factory synthesizes req.headers.authorization from
// connectionParams — graphql-ws has no cookie transport at all).
const cookieExtractor = (req: { cookies?: Record<string, string> } | undefined): string | null => {
  return req?.cookies?.[ACCESS_COOKIE_NAME] ?? null;
};

export interface JwtPayload {
  sub: string;
  roles: string[];
  client_org_id: string | null;
  // Self-scoping for the 'patient' role: null for every other role, and for
  // a patient account not yet linked to a Patients row. Embedded in the JWT
  // (same pattern as client_org_id) so every resolver/service can scope a
  // patient caller to their own records without an extra DB round-trip.
  patient_id?: string | null;
  // Same pattern, for the 'clinician' role (TC-APPT-API-010: a clinician's
  // appointments query must default to their own schedule, not the whole org's).
  clinician_id?: string | null;
  // REQ049/REQ015 (US-SEC-02) — the caller's role's granted Permissions.name
  // values, resolved once at token-issuance time (auth.service.ts). Never
  // recomputed mid-token-lifetime: a permission change takes effect on the
  // caller's next login/refresh, same staleness window client_org_id/roles
  // already have.
  permissions?: string[];
  // REQ053 (US-SEC-06) — set only for an impersonation-session token. `sub`
  // is the TARGET's user id (so every existing role/self-scoping check
  // naturally evaluates as the target, exactly as impersonation requires);
  // this field carries the REAL actor's id, read by AuditLogInterceptor so
  // every action taken while impersonating is attributed to the real actor,
  // not the impersonated identity.
  real_actor_id?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET must be set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
