import { applyDecorators } from '@nestjs/common';
import { Roles } from './roles.decorator';

// GqlAuthGuard is now global (app.module.ts, APP_GUARD) and always runs before
// RolesGuard, so req.user is guaranteed populated by the time @Roles() is
// checked — no per-handler @UseGuards(GqlAuthGuard) needed anymore. This
// decorator is now just Roles() under a clearer name for resolver call sites;
// kept as a single import so a future guard addition has one place to change.
export const Auth = (...roles: string[]) => applyDecorators(Roles(...roles));
