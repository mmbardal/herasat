import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// Plugins
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },

  // TypeScript Rules
  {
    files: ["**/*.{ts,tsx}"],
  },

  {
    ignores: ["lints"]
  },

  eslintConfigPrettier
);