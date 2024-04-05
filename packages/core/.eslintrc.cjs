/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@oyster/eslint-config/base'],
  rules: {
    'no-constant-condition': ['error', { checkLoops: false }],
  },
};
