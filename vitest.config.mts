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
    },
  },
});
