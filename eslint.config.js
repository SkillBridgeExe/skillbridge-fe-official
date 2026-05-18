import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import unusedImportsPlugin from "eslint-plugin-unused-imports";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Tắt rule gốc, để unused-imports plugin xử lý (có auto-fix)
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.*"],
  },
];
