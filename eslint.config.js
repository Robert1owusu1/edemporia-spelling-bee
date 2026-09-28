// ESLint flat config (ESLint 10).
//
// Shape:
//   - @eslint/js recommended (all files)
//   - typescript-eslint recommended, NON type-checked (the codebase does not
//     use `strict` yet and type-aware linting would need projectService/tsconfig
//     wiring; a later pass can upgrade to `recommendedTypeChecked`)
//   - react-hooks rules-of-hooks + exhaustive-deps as errors
//   - react-refresh/only-export-components (Vite + React fast refresh)
//   - project rules: unused vars ( ^_ ignored ), `any` as warning, no-console
//     (warn/error allowed), eqeqeq, prefer-const
//   - eslint-config-prettier last: Prettier owns formatting, no style rules here
//
// NOTE: never run `eslint --fix` across the repo while another agent is editing
// src/ — lint reports only.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'backend/node_modules/**',
      'backend/prisma/migrations/**',
      'package-lock.json',
      'backend/package-lock.json',
      '**/*.min.js',
    ],
  },

  // --- Recommended bases -----------------------------------------------------
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Globals per area -----------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['backend/**/*.{js,cjs}'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
    rules: {
      // backend/ is intentionally CommonJS (require() is the module system),
      // so the ESM-only `no-require-imports` rule would be pure noise there.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Config/tooling files at the repo root (vite.config.ts, eslint.config.js, …)
    files: ['*.{js,mjs,cjs,ts}', 'scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // --- Project-wide quality rules (errors) -----------------------------------
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Becomes an error in a later pass.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // --- console hygiene -------------------------------------------------------
  // src/: no console.log (warn/error still allowed for real diagnostics).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // backend/: console IS the log sink here (Express startup/shutdown logs,
  // fatal handlers) and the scripts/ directory is CLI tooling whose stdout is
  // its user interface — restricting it to warn/error would only push real
  // logs through the wrong channel.
  {
    files: ['backend/**/*.{js,cjs}'],
    rules: {
      'no-console': 'off',
    },
  },

  // --- React (Vite + React 19) ----------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowCompoundComponents: true,
          // The React-idiomatic context pattern is one provider component plus
          // its `useX` hook in the same file; exporting the hook is what makes
          // the context safe to consume, not a fast-refresh hazard.
          allowExportNames: ['useAuth', 'useSettings'],
        },
      ],
    },
  },

  // --- Prettier owns formatting: must stay last ------------------------------
  prettier,
];
