import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

// The default ThrottlerGuard assumes an HTTP ExecutionContext
// (context.switchToHttp().getRequest()), which returns undefined under
// GraphQL — this mirrors GqlAuthGuard's pattern to fix that.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  // Subscriptions run over a long-lived graphql-ws connection with a
  // synthesized req/res (app.module.ts's context factory) that has no real
  // Express `res.header()` to write rate-limit headers to — the underlying
  // @nestjs/throttler implementation assumes one always exists and throws
  // otherwise. Per-request throttling doesn't map cleanly onto a persistent
  // connection anyway, so subscriptions are exempted here rather than faked.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context);
    if (gqlCtx.getInfo()?.operation?.operation === 'subscription') {
      return true;
    }
    return super.canActivate(context);
  }

  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.req.res };
  }
}
