module.exports = {
  plugins: ['prettier-plugin-tailwindcss'],
  printWidth: 80,
  proseWrap: 'always',
  semi: true,
  singleQuote: true,
  tailwindConfig: './config/tailwind/tailwind.config.js',
  tailwindFunctions: ['cx'],
  trailingComma: 'es5',
};
