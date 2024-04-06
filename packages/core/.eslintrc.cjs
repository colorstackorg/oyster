/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['@oyster/eslint-config/base'],
  parserOptions: {
    project: __dirname + '/tsconfig.json',
  },
  rules: {
    'no-constant-condition': ['error', { checkLoops: false }],
  },
};
