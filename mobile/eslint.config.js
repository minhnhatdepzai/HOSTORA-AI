const expoConfig = require("eslint-config-expo/flat");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  ...expoConfig,
  globalIgnores([".expo/**", "android/**", "releases/**", "dist/**", "web-build/**"]),
]);
