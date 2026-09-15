import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/config/env";
import { LoginForm } from "@/features/auth/login-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // A valid session here means the user reached /login by typing the URL.
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/*
            A real <h1> inside the title: CardTitle renders a plain <div>, which
            would leave this page with no heading at all — nothing for a screen
            reader to navigate by, on the one page every visitor sees.
          */}
          <CardTitle className="text-xl">
            <h1>Sign in</h1>
          </CardTitle>
          <CardDescription>Continue to {env.NEXT_PUBLIC_APP_NAME}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* LoginForm reads search params, which requires a Suspense boundary. */}
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
