import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        PREDEFINED_THEMES: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
      "semi": ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  // Test files run in Node.js (vitest) — allow Node globals alongside browser globals
  {
    files: [
      "custom_components/entity_manager/frontend/tests/**/*.js",
      "vitest.config.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];