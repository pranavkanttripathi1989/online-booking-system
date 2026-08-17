import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import { GqlAuthGuard } from './gql-auth.guard';

describe('GqlAuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: GqlAuthGuard;

  const fakeContext = (): ExecutionContext => {
    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue({ getContext: () => ({ req: {} }) } as any);
    return { getHandler: () => ({}), getClass: () => ({}) } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new GqlAuthGuard(reflector as unknown as Reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  it('bypasses the passport-jwt check entirely for a resolver marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const superSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');

    expect(guard.canActivate(fakeContext())).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();
  });

  it('delegates to the real passport-jwt strategy for every resolver without @Public() — fail-closed by default (backend-hard-rules.md Rule 2)', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any);

    guard.canActivate(fakeContext());

    expect(superSpy).toHaveBeenCalledTimes(1);
  });

  it('also delegates when the @Public() reflector lookup returns undefined (no annotation at all) — undefined must not be treated as public', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any);

    guard.canActivate(fakeContext());

    expect(superSpy).toHaveBeenCalledTimes(1);
  });
});
