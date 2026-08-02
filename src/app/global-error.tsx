"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary — it replaces the root layout, so it must render
 * its own `<html>` and `<body>` and cannot rely on any provider, font or
 * stylesheet the app normally sets up. Inline styles keep it working even when
 * the CSS bundle is the thing that failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            The application could not load
          </h1>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            An unexpected error occurred. Please reload the page or try again shortly.
          </p>
          {error.digest ? (
            <p style={{ color: "#999", fontSize: "0.75rem", marginBottom: "1.25rem" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              border: "1px solid #d4d4d4",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
