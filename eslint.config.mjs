import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override rules that are too strict for this project
  {
    rules: {
      // Allow 'any' types for flexibility in rapid development
      "@typescript-eslint/no-explicit-any": "off",
      // Allow setState in effects for localStorage sync patterns
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Development scripts (not part of production build)
    "scripts/**",
    // Prisma seed (database setup script)
    "prisma/seed.ts",
  ]),
]);

export default eslintConfig;
