import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET must be set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
