import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/* Vitest does not read tsconfig's `paths`, so `@/` has to be re-declared here.
   The usual answer is the `vite-tsconfig-paths` plugin; this is the same thing
   in three lines and no new dependency, which AGENTS.md Rule 3 cares about.

   Scope: money, passwords and time — never the deck. See docs/testing.md. */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
