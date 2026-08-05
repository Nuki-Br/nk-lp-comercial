"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createMutableServerClient } from "@/server/supabase/serverClient";

/* Thin by design: parse, delegate, redirect. No SQL, no crypto, no policy —
   those live in src/server/. This file is the seam between a <form> and that. */

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /* A path, never a URL. `new URL(next)` here would be an open redirect that
     lands a signed-in admin on someone else's site with their session warm. */
  next: z
    .string()
    .regex(/^\/admin(\/[\w\-/]*)?$/)
    .optional(),
});

export type LoginState = { error: string | null };

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) return { error: "Informe um e-mail e uma senha válidos." };

  /* The MUTABLE client: this is an action, cookies are writable, and a swallowed
     write here would be an intermittent logout with no trace. */
  const supabase = await createMutableServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  /* One message for every failure. Distinguishing "no such account" from "wrong
     password" tells an attacker which addresses are worth attacking. */
  if (error) return { error: "E-mail ou senha incorretos." };

  redirect(parsed.data.next ?? "/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createMutableServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
