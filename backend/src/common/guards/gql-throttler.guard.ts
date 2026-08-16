import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

// The default ThrottlerGuard assumes an HTTP ExecutionContext
// (context.switchToHttp().getRequest()), which returns undefined under
// GraphQL — this mirrors GqlAuthGuard's pattern to fix that.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.req.res };
  }
}
