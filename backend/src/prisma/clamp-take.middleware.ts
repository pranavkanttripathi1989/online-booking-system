import { Prisma } from '@prisma/client';

// P3.3 (project-plans/06-execution-plan.md, F-14): a real, cross-cutting
// safety net, not a fix for the ~19 services with a genuinely unbounded
// findMany -- doing that properly means adding a paginated GraphQL contract
// to each of them, matching each consumer's existing shape (Hard Rule 7),
// which is per-domain requirement-sized work, not a one-line change. This
// is the backstop for the gap in between: no resolver can return an
// unbounded collection even before that per-domain work lands, and no
// existing paginated query is affected -- only findMany calls that pass no
// `take` at all get clamped.
export const DEFAULT_MAX_TAKE = 200;

// Extracted from PrismaService.onModuleInit() so it's unit-testable without
// standing up a real PrismaClient/database connection -- same rationale as
// common/utils/assert-known-node-env.ts.
export function clampTakeMiddleware(defaultMaxTake: number = DEFAULT_MAX_TAKE): Prisma.Middleware {
  return async (params, next) => {
    if (
      params.action === 'findMany' &&
      (params.args === undefined || (params.args as { take?: number }).take === undefined)
    ) {
      params.args = { ...(params.args ?? {}), take: defaultMaxTake };
    }
    return next(params);
  };
}
