module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/src/test/fileMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // P1.6 (project-plans/06-execution-plan.md) — coverage measured against
  // the whole source tree, not just the files that happen to have tests, so
  // the real (currently low) number is visible and can't silently regress.
  // `global` is a ratchet floor set to what this slice actually measured
  // (see TR060) — raise it as more of the tree gains coverage, never lower
  // it. The two per-path overrides are the slice's own >90% commitments:
  // the route guards and the date/currency formatters.
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/test/**',
    '!src/mocks/**',
  ],
  coverageThreshold: {
    // Measured 2026-08-23 (TR060): 2.46% stmts / 1.64% branches / 1.71%
    // funcs / 2.75% lines. Set just below that real number, not invented
    // ahead of measuring — this is a floor against regression, not a target.
    global: { statements: 2.4, branches: 1.6, functions: 1.7, lines: 2.7 },
    './src/components/ProtectedRoute/**/*.jsx': { statements: 90, branches: 90, functions: 90, lines: 90 },
    './src/utils/dateTime.js': { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};
