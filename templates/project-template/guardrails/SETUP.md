## Standard guardrails setup (medium projects)

This folder provides a **standard** guardrails skeleton:

- Husky git hooks
- lint-staged (only checks staged files for speed)
- commitlint (consistent commit messages)
- ESLint + Prettier
- Typecheck + tests (optional, depending on project)
- Custom checks in `scripts/check-*.mjs`

### 1) Install dev dependencies (recommended)

Run these in your project root (pick what applies):

```powershell
# core
npm i -D husky lint-staged prettier

# commit message linting (optional but recommended)
npm i -D @commitlint/cli @commitlint/config-conventional

# JS/TS linting (optional but recommended)
npm i -D eslint @eslint/js

# If you use TypeScript
npm i -D typescript

# If you want unit tests
npm i -D vitest
```

### 2) Add scripts to your `package.json`

Add (or adapt) these scripts:

```json
{
  "scripts": {
    "prepare": "husky",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest",
    "check": "npm run format:check && npm run lint",
    "check:all": "npm run check && npm run typecheck && npm run test",
    "release:verify": "npm run check:all && npm run build"
  }
}
```

Notes:

- Keep `check` fast; use `check:all` for PRs; use `release:verify` before shipping.

### 3) Copy config + hooks into your project root

Copy these template files/folders into your project root:

- `.husky/`
- `lint-staged.config.mjs`
- `commitlint.config.cjs`
- `eslint.config.js` (optional)
- `.prettierrc.json` (optional)
- `.prettierignore` (optional)
- `scripts/check-project.mjs` (example custom check)

### 4) Initialize hooks

```powershell
npm run prepare
```

### 5) Verify

```powershell
npm run check
```
