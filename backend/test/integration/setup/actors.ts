import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../../../src/auth/strategies/jwt.strategy';
import { IDS } from './fixture';

/**
 * The caller archetypes from technical-plans/00-foundation-hardening.md §4.
 *
 * Each carries a REAL JWT signed with the same secret the app verifies against,
 * in the exact `JwtPayload` shape auth/strategies/jwt.strategy.ts declares. No
 * guard is stubbed and no request is hand-injected with a `req.user`: the token
 * goes through GqlThrottlerGuard -> GqlAuthGuard -> RolesGuard exactly as a
 * browser's would. Mocking any part of that chain would reintroduce the very
 * gap this suite exists to close.
 */

export type ActorName =
  | 'superAdmin'
  | 'admin'
  | 'managerA'
  | 'clinicianA'
  | 'staffA'
  | 'patientA'
  | 'managerB'
  | 'patientNoOrg'
  | 'anonymous';

export interface Actor {
  name: ActorName;
  /** Human-readable description used in test titles. */
  label: string;
  payload: JwtPayload | null;
  token: string | null;
  /** Which org's rows this caller is entitled to see; null = platform-wide. */
  org: string | null;
  isPlatformOperator: boolean;
}

function sign(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET must be set — see test/integration/setup/env.ts');
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

function actor(
  name: ActorName,
  label: string,
  payload: JwtPayload | null,
  opts: { org?: string | null; platform?: boolean } = {},
): Actor {
  return {
    name,
    label,
    payload,
    token: payload ? sign(payload) : null,
    org: opts.org ?? null,
    isPlatformOperator: opts.platform ?? false,
  };
}

export function buildActors(): Record<ActorName, Actor> {
  return {
    superAdmin: actor(
      'superAdmin',
      'super_admin (no org — platform operator)',
      { sub: IDS.userSuperAdmin, roles: ['super_admin'], client_org_id: null },
      { platform: true },
    ),
    admin: actor(
      'admin',
      'admin (no org — platform operator)',
      { sub: IDS.userAdmin, roles: ['admin'], client_org_id: null },
      { platform: true },
    ),
    managerA: actor(
      'managerA',
      'manager (org A)',
      { sub: IDS.userManagerA, roles: ['manager'], client_org_id: IDS.orgA },
      { org: IDS.orgA },
    ),
    clinicianA: actor(
      'clinicianA',
      'clinician (org A)',
      { sub: IDS.userClinicianA, roles: ['clinician'], client_org_id: IDS.orgA, clinician_id: IDS.clinicianA },
      { org: IDS.orgA },
    ),
    staffA: actor(
      'staffA',
      'staff (org A)',
      { sub: IDS.userStaffA, roles: ['staff'], client_org_id: IDS.orgA },
      { org: IDS.orgA },
    ),
    patientA: actor(
      'patientA',
      'patient (org A, linked to a Patients row)',
      { sub: IDS.userPatientA, roles: ['patient'], client_org_id: IDS.orgA, patient_id: IDS.patientA },
      { org: IDS.orgA },
    ),
    managerB: actor(
      'managerB',
      'manager (org B)',
      { sub: IDS.userManagerB, roles: ['manager'], client_org_id: IDS.orgB },
      { org: IDS.orgB },
    ),
    // The one that matters. Anyone on the public internet can mint this in one
    // `register` call (auth.service.ts) — patient role, no org, no patient link.
    // It must see NOTHING, and "no org" must never be read as "all orgs".
    patientNoOrg: actor(
      'patientNoOrg',
      'patient (self-registered — NO org, NO patient link)',
      { sub: IDS.userPatientNoOrg, roles: ['patient'], client_org_id: null, patient_id: null },
      { org: null },
    ),
    anonymous: actor('anonymous', 'unauthenticated', null),
  };
}
