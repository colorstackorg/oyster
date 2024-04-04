/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['../../config/eslint/base.js'],
  ignorePatterns: ['/*', '!/src/**/*.{ts,tsx}'],
  root: true,
};
