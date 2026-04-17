export default {
  "*.{js,cjs,mjs,ts,tsx,css,html,json,md,yml,yaml}": ["prettier --write"],
  "*.{js,cjs,mjs,ts,tsx}": ["eslint --fix"],
};
