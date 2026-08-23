// F-12/P3.7: a misconfigured NODE_ENV (unset, or a typo like "produciton")
// previously fell through app.module.ts's/formatError's `!== 'production'`
// checks as "not production" — the safe-looking default, but the WRONG one:
// it means introspection and raw stack traces stay enabled on what was
// actually meant to be a production deployment. Fail loudly at boot instead
// of silently defaulting to the more permissive state.
export const KNOWN_NODE_ENVS = new Set(['development', 'test', 'production']);

export function assertKnownNodeEnv(env: string | undefined): void {
  if (!env || !KNOWN_NODE_ENVS.has(env)) {
    throw new Error(
      `NODE_ENV must be one of ${[...KNOWN_NODE_ENVS].join('/')} — got ${JSON.stringify(env)}. ` +
      'Refusing to boot with an unset/unrecognized value: this flag gates GraphQL introspection ' +
      'and error-detail stripping, and every check treats "not production" as the permissive default.',
    );
  }
}
