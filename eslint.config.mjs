// The portal's lint setup.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/coverage/**', '**/next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The portal runs in browsers as well as on the server.
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-console': 'warn',
      // A leading underscore marks a value left unused on purpose, e.g. one
      // destructured out of an object to leave the rest.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
);
