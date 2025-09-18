module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off', // Disable PropTypes since we're using TypeScript
    '@typescript-eslint/no-explicit-any': 'warn', // Make 'any' types warnings instead of errors
    '@typescript-eslint/no-unused-vars': 'warn', // Make unused vars warnings
    '@typescript-eslint/no-non-null-assertion': 'warn', // Make non-null assertions warnings
    // Safeguard: prevent direct tel: usage outside legal pages
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.object.name='Linking'][callee.property.name='openURL'] > Literal.arguments[value=/^tel:/]",
        message:
          'Direct tel: links are restricted. Use getPhoneWithPermission and centralized helpers instead.',
      },
    ],
  },
  overrides: [
    {
      files: ['app/legal/**'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};