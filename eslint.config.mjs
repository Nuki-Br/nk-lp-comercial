import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/* ESLint is kept ONLY for the Next rules Biome does not reimplement —
   no-html-link-for-pages, no-sync-scripts, no-unwanted-polyfillio and several
   core-web-vitals rules. Every stylistic and TypeScript rule is off (the
   `typescript` preset is deliberately not spread in) so the two linters can
   never disagree about the same line. Biome owns format, imports and the fast
   lint pass. See docs/decisions.md ADR 16. */
const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Never point a linter at the 5.7 MB demo source or its built artifact.
    "src/HTML/**",
    "public/demos/**",
  ]),
]);

export default eslintConfig;
