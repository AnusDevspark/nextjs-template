"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { LoadingButton } from "@/components/common/loading";
import { FormError, FormInput, applyApiErrorsToForm } from "@/components/forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/errors";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Sign-in form.
 *
 * Posts to the Next.js BFF (`/api/auth/login`) rather than the Node API
 * directly, so the tokens are written to HttpOnly cookies server-side and the
 * refresh token never touches JavaScript.
 *
 * Uses `window.location.assign` on success instead of `router.push`: the whole
 * authenticated tree — including the server layout that reads the session — has
 * to re-render with the new cookies, and a full navigation is the honest way to
 * get that.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const expired = searchParams.get("expired") === "1";
  const next = searchParams.get("next");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
          errors?: { path: string; message: string }[];
        };

        applyApiErrorsToForm(
          new ApiError({
            status: response.status,
            code: body.code,
            message: body.message ?? "Could not sign you in.",
            errors: body.errors,
          }),
          form,
          { knownFields: ["email", "password"] },
        );
        return;
      }

      const target = next && next.startsWith("/") ? next : "/";
      window.location.assign(target);
    } catch {
      form.setError("root.serverError", {
        message: "Could not reach the server. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      {expired ? (
        <Alert>
          <AlertDescription>Your session expired. Please sign in again.</AlertDescription>
        </Alert>
      ) : null}

      <FormError form={form} title="Sign in failed" />

      <FormInput
        control={form.control}
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="username"
        required
      />

      <FormInput
        control={form.control}
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />

      <LoadingButton
        type="submit"
        className="w-full"
        loading={submitting}
        loadingText="Signing in…"
      >
        Sign in
      </LoadingButton>
    </form>
  );
}
