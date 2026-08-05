import { AccessGate } from "@/components/deck/AccessGate";

/**
 * The shared-password gate, scoped to `/fast` and nothing else.
 *
 * It used to live in the `(deck)` root layout, which was correct while `/fast`
 * was the only route in the group. `/p/[slug]` is in the same group, so leaving
 * it there would put the *Nuki team's* password in front of every client link,
 * and a visitor holding a valid proposal cookie would be shown a form asking for
 * a password they were never given.
 *
 * The two gates are not variations of one idea; they are opposites, and ADR 9 is
 * about that difference. This one compares a password inlined in the client
 * bundle — a speed bump that keeps working when Supabase is down, which is the
 * whole point of `/fast`. `/p/[slug]` verifies on the server and never sends
 * content the visitor has not unlocked.
 *
 * `gate.css` stays imported by the root layout: `ProposalGate` reuses the same
 * `.gate*` markup, so both surfaces need the stylesheet even though only this
 * one needs this component.
 */
export default function FastDeckLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AccessGate>{children}</AccessGate>;
}
