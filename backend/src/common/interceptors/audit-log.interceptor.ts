import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// REQ012/PLAN021 — admin/Policies.jsx "Security & Privacy" tab's "Enable
// audit logging" toggle. getAuditLogs (backend/src/users) has existed since
// the Users/RBAC increment, but nothing anywhere ever wrote a row -- the
// query resolver was real, the write side never existed. This interceptor
// is that write side: every GraphQL *mutation* (queries are deliberately
// excluded -- logging every read would be noise, and the two known
// consumers of "audit log" in this app, admin/users/index.jsx's Audit Logs
// tab and this same toggle's own description, both mean "who changed what").
//
// Gated per-org by ClientOrganizations.audit_log_enabled. An org-less caller
// (admin/super_admin) is always logged regardless -- consistent with this
// schema's existing "org-less caller sees/does everything, unscoped"
// precedent (see backend-hard-rules / CLAUDE.md Architecture section) rather
// than silently skipping platform-operator activity because it belongs to
// no single org's setting.
//
// action/resource are derived from the mutation's own field name by
// convention (e.g. `createAppointment` -> action "create", resource
// "Appointment") rather than requiring every resolver to opt in explicitly --
// every mutation in this codebase already follows verb+PascalCase-noun
// naming (checked against graphql/mutations.js), so this holds without
// per-resolver annotation.
const VERB_PATTERN = /^(create|update|delete|remove|toggle|deactivate|activate|revoke|reset|verify|confirm|start|book|cancel|reschedule|complete|mark|send|request|register|login|logout|refresh|upload)([A-Z].*)?$/;

function parseFieldName(fieldName: string): { action: string; resource: string } {
  const match = fieldName.match(VERB_PATTERN);
  if (!match) return { action: 'mutate', resource: fieldName };
  const [, verb, rest] = match;
  const resource = rest ? rest.replace(/([a-z])([A-Z])/g, '$1 $2').trim() : fieldName;
  return { action: verb, resource: resource || fieldName };
}

// Never write a raw credential/secret into an audit row's `details` JSON,
// even though this is an internal admin-facing log -- an audit trail that
// itself becomes a plaintext-secret store is a liability, not a safeguard.
const REDACTED_ARG_KEYS = new Set([
  'password', 'new_password', 'old_password', 'current_password',
  'token', 'access_token', 'refresh_token', 'reset_token',
  'code', 'otp', 'totp_code', 'backup_code',
  'secret', 'api_key', 'apiKey', 'razorpay_signature',
]);

function sanitizeArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (REDACTED_ARG_KEYS.has(key)) {
      out[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeArgs(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// `id` is the mutation's own target when it's the caller's own arg (update/
// delete-by-id); falls back to the resolved result's own `id` field for a
// create (which has no id to pass in, only one to receive back).
function extractResourceId(args: Record<string, unknown>, result: unknown): string | undefined {
  if (typeof args?.id === 'string') return args.id;
  if (result && typeof result === 'object' && typeof (result as { id?: unknown }).id === 'string') {
    return (result as { id: string }).id;
  }
  return undefined;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    if (info?.operation?.operation !== 'mutation') {
      return next.handle();
    }

    const req = gqlContext.getContext()?.req;
    const user = req?.user as { sub?: string; client_org_id?: string | null; real_actor_id?: string | null } | undefined;
    const fieldName: string = info.fieldName;
    const args = gqlContext.getArgs<Record<string, unknown>>();

    return next.handle().pipe(
      tap({
        next: (result) => this.writeLog(user, fieldName, req, args, 'success', result),
        // A failed mutation is itself worth an audit trail (an attempted,
        // rejected action) -- logged the same way, never allowed to mask
        // or alter the original error passed back to the caller. No result
        // to read a created-entity id from on this path -- resource_id can
        // only ever come from the caller's own args here.
        error: () => this.writeLog(user, fieldName, req, args, 'failure', undefined),
      }),
    );
  }

  private async writeLog(
    user: { sub?: string; client_org_id?: string | null; real_actor_id?: string | null } | undefined,
    fieldName: string,
    req: any,
    args: Record<string, unknown>,
    outcome: 'success' | 'failure',
    result: unknown,
  ) {
    try {
      if (user?.client_org_id) {
        const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
        if (!org?.audit_log_enabled) return;
      }
      const { action, resource } = parseFieldName(fieldName);
      // REQ053 (US-SEC-06) — during an impersonation session, user_id is
      // the REAL actor (never the impersonated identity), and
      // acting_as_user_id records who was being impersonated. Every other
      // caller (real_actor_id absent) is unaffected -- acting_as_user_id
      // stays null, user_id stays their own sub, byte-for-byte the same as
      // before this slice.
      await this.prisma.auditLogs.create({
        data: {
          user_id: user?.real_actor_id ?? user?.sub,
          acting_as_user_id: user?.real_actor_id ? user?.sub : undefined,
          action,
          resource,
          resource_id: extractResourceId(args, result),
          details: sanitizeArgs(args) as Prisma.InputJsonValue,
          ip_address: req?.ip ?? undefined,
          user_agent: req?.headers?.['user-agent'] ?? undefined,
          outcome,
        },
      });
    } catch {
      // Audit logging must never break the real mutation it's observing --
      // already-succeeded (or already-failed) by the time this runs.
    }
  }
}
