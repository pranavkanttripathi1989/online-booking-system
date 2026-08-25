/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/test-setup.ts'],
  // REQ103: isolatedModules skips per-file type-checking during transform
  // (types are still enforced by `tsc --noEmit` and eslint, both mandatory
  // pre-commit steps) — mirrors jest.integration.config.js's own already-
  // proven tradeoff, made for the identical reason: type-checking cost
  // scales with file count and was measured exceeding the suite's own
  // runtime there. This is the local/CI unit-test transform's fast path.
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coveragePathIgnorePatterns: ['.entity.ts', '.module.ts', '.input.ts', 'main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
