module.exports = {
  '*.{json,jsonc,css,md}': ['prettier --write'],
  '*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx}': ['eslint --cache --fix', 'prettier --write'],
  '**/*.ts?(x)': () => 'pnpm typecheck-fast'
}
