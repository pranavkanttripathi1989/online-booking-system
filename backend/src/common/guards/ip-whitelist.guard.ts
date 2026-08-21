import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service';

// REQ012/PLAN021 — admin/Policies.jsx "Security & Privacy" tab's "IP
// whitelist for admin" toggle. Scoped to `manager`-role callers of the org
// that turned it on -- admin/super_admin are platform-wide (client_org_id:
// null, this schema's own established convention) and can't sensibly be
// restricted by any single org's IP list; a manager is the role that
// actually reaches this org's own admin panel routes (App.jsx's
// /admin/policies /admin/communications block).
//
// Runs after GqlAuthGuard/RolesGuard (registered later in app.module.ts's
// APP_GUARD array, which NestJS runs in registration order) so req.user is
// already populated. Public/unauthenticated routes have no req.user and are
// skipped, same as every other global guard's fail-open-for-@Public()
// behavior in this codebase.
function isIpAllowed(ip: string, list: string[]): boolean {
  // Strip a leading IPv6-mapped-IPv4 prefix (Express's req.ip reports
  // "::ffff:127.0.0.1" for IPv4 clients behind some proxies/loopback).
  const normalized = ip.replace(/^::ffff:/, '');
  return list.some((entry) => {
    if (!entry.includes('/')) return entry === normalized;
    const [rangeIp, prefixStr] = entry.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    const toInt = (addr: string) => addr.split('.').reduce((acc, octet) => (acc << 8) + (parseInt(octet, 10) & 255), 0) >>> 0;
    const ipParts = normalized.split('.');
    const rangeParts = rangeIp.split('.');
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (toInt(normalized) & mask) === (toInt(rangeIp) & mask);
  });
}

// Always reachable regardless of IP -- otherwise a manager who enables the
// whitelist with a wrong/typo'd entry has no way to ever fix it again
// (the very mutation that would turn it back off would itself be blocked).
// A real, deliberate safety exemption, not an oversight.
const EXEMPT_FIELDS = new Set(['myOrgSecuritySettings', 'updateMyOrgSecuritySettings']);

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext()?.req;
    const user = req?.user as { client_org_id?: string | null; roles?: string[] } | undefined;
    const fieldName: string | undefined = ctx.getInfo()?.fieldName;

    if (!user?.client_org_id || !user.roles?.includes('manager') || (fieldName && EXEMPT_FIELDS.has(fieldName))) {
      return true;
    }

    const org = await this.prisma.clientOrganizations.findUnique({ where: { id: user.client_org_id } });
    if (!org?.ip_whitelist_enabled) return true;

    const list = (org.ip_whitelist ?? '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return true; // enabled with an empty list -- fail open, not a full lockout by accident

    const callerIp: string | undefined = req?.ip;
    if (!callerIp || !isIpAllowed(callerIp, list)) {
      throw new ForbiddenException('Your IP address is not on this organization\'s allowed list.');
    }
    return true;
  }
}
