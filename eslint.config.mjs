import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  { ignores: ["vite.config.js", "dist/"] },
  { files: ["**/*.{js,mjs,cjs}"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
  },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  {
    plugins: {
      js,
      prettier: prettierPlugin,
    },
  },
  {
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules, // 把 ESLint 的格式規則關掉
      "prettier/prettier": "warn", // 把 Prettier 問題顯示為警告
    },
  },
]);
