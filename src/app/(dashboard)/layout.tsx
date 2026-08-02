import { env } from "@/config/env";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { getAccessToken } from "@/lib/auth/auth-cookies";
import { requireSession } from "@/lib/auth/session";

/**
 * Layout for every authenticated page.
 *
 * A Server Component: it reads the session before rendering, so an unauthorised
 * visitor is redirected without the shell ever reaching the browser, and the
 * client providers start with the user already known — no loading flash, no
 * permission-gated buttons appearing a beat late.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Only needed when the browser talks to the API directly; in proxy mode the
  // token stays server-side and this stays null.
  const accessToken = env.NEXT_PUBLIC_API_MODE === "direct" ? await getAccessToken() : null;

  return (
    <Providers initialUser={session.user} initialAccessToken={accessToken ?? null}>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
