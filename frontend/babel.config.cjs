// This config is consumed by Jest (babel-jest) only — Vite's own dev/build
// pipeline uses @vitejs/plugin-react's own esbuild-based transform and never
// reads this file, so the import.meta shim below has zero effect on the
// real app; it only lets Jest parse source files that use Vite's
// `import.meta.env.*` convention (VITE_GRAPHQL_URL, DEV, ...), which
// `@babel/preset-env` cannot represent in CommonJS output on its own.
// Every real call site already falls back gracefully when the env var is
// undefined (e.g. `import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql'`),
// so replacing `import.meta` with an empty `{ env: {} }` under test is a
// correct stand-in, not a workaround that changes real behaviour.
function importMetaEnvShimForJest() {
  return {
    visitor: {
      MetaProperty(path) {
        path.replaceWithSourceString('({ env: {} })')
      },
    },
  }
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    '@babel/plugin-syntax-import-meta',
    importMetaEnvShimForJest,
  ],
};
