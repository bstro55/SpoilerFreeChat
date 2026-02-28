import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // vite.config.js is a Node.js build file — exclude it from the browser lint config
  globalIgnores(['dist', 'vite.config.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Prevent console.log from shipping to production. Surface errors through
      // UI state instead. console.error is allowed for unhandled exceptions.
      'no-console': ['warn', { allow: ['error'] }],
      // These rules became strict errors in eslint-plugin-react-hooks@7 and
      // eslint-plugin-react-refresh@0.4. The patterns they flag are pre-existing
      // and acceptable in this codebase — downgraded to warnings so they're
      // visible during development without blocking commits.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
