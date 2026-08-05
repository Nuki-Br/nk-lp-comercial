/**
 * Stub. O compositor de propostas é a etapa 3; a autenticação é a etapa 2.
 *
 * Existe agora só pra que `(admin)/layout.tsx` tenha uma rota — um root layout
 * sem página nenhuma abaixo dele não é exercitado por nada, e o isolamento de
 * CSS que ele existe pra provar ficaria sem prova. Enquanto isso, `/` aponta
 * pro `/fast` (next.config.ts), não pra cá: mandar o bookmark do time pra uma
 * página vazia seria pior que o redirect antigo. A etapa 2 inverte isso.
 */
export default function AdminPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-nuki-green-03">Painel em construção</h1>
    </main>
  );
}
