/**
 * Configuración de ESLint (config plana de Expo).
 */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);
