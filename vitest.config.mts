import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/* `.mts`, não `.ts`: o carregador de config nativo do Vite trata `.ts` na raiz
   como CommonJS (não há `"type": "module"` no package.json, e adicionar um
   mudaria a resolução de módulos do projeto inteiro). A extensão `.mts` declara
   ESM sem efeito colateral nenhum.

   Vitest não lê os `paths` do tsconfig, então `@/` é re-declarado aqui. O
   caminho usual seria o plugin `vite-tsconfig-paths`; isto é a mesma coisa em
   três linhas e sem dependência nova, que é o que a Regra 3 do AGENTS.md cobra.

   Escopo: dinheiro, senhas e tempo — nunca o deck. Ver docs/testing.md. */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),

      /* `server-only` is not a dependency and does not resolve as a bare import
         — Next's bundler aliases it to a copy it ships, which is why the app
         builds and Rule 3's allowlist stays at six packages. Vitest is not that
         bundler, so it needs the same alias or every src/server/ test dies on
         line 1.

         Pointed at `empty.js` deliberately: that is the file the real package
         resolves to under the `react-server` condition. `index.js` throws by
         design. */
      "server-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
