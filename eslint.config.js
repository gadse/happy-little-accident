import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Must be last — disables ESLint rules that conflict with Prettier
      prettierConfig,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Domain purity: forbid runtime imports of any `dependencies` package inside src/domain/
  // Type-only imports (erased at compile time) are explicitly allowed — Requirement 11.1
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'Domain layer must not import from React packages.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
])
