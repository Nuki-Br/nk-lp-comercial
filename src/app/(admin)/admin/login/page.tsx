import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Nuki",
  robots: { index: false, follow: false },
};

/* The only /admin route that does not call requireAdmin(), for the obvious
   reason. proxy.ts redirects an already-signed-in visitor away from here. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-nuki-gray-7">
            Painel comercial
          </p>
          <h1 className="mt-2 text-2xl font-bold text-nuki-green-03">Entrar</h1>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
