/**
 * lint-staged configuration.
 *
 * Uses function syntax for TypeScript checks so that `tsc --noEmit` runs
 * against the full project config (not individual files). When tsc receives
 * individual file arguments, it bypasses tsconfig include/exclude and module
 * settings, causing false errors with ESM features like `import.meta`.
 *
 * See: Lesson #11 in agents/memory/bank.md
 */
export default {
  'packages/**/*.{ts,js}': (stagedFiles) => [
    `eslint --fix ${stagedFiles.join(' ')}`,
    'npm run typecheck --workspaces',
  ],
  '*.md': ['prettier --write --parser markdown'],
  '*.{json,yml,yaml}': ['prettier --write'],
};
