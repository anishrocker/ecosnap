import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", ".expo", "node_modules", "babel.config.js", "metro.config.js", "app.config.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
