import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
    const user = req?.user as { sub?: string; client_org_id?: string | null } | undefined;
    const fieldName: string = info.fieldName;

    return next.handle().pipe(
      tap({
        next: () => this.writeLog(user, fieldName, req),
        // A failed mutation is itself worth an audit trail (an attempted,
        // rejected action) -- logged the same way, never allowed to mask
        // or alter the original error passed back to the caller.
        error: () => this.writeLog(user, fieldName, req),
      }),
    );
  }

  private async writeLog(
    user: { sub?: string; client_org_id?: string | null } | undefined,
    fieldName: string,
    req: any,
  ) {
    try {
      if (user?.client_org_id) {
        const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
        if (!org?.audit_log_enabled) return;
      }
      const { action, resource } = parseFieldName(fieldName);
      await this.prisma.auditLogs.create({
        data: {
          user_id: user?.sub,
          action,
          resource,
          ip_address: req?.ip ?? undefined,
        },
      });
    } catch {
      // Audit logging must never break the real mutation it's observing --
      // already-succeeded (or already-failed) by the time this runs.
    }
  }
}
