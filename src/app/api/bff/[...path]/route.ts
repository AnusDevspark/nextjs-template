import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/config/server-env";
import { getAccessToken } from "@/lib/auth/auth-cookies";

/**
 * Optional pass-through proxy to the Node API.
 *
 * Off by default. Enable with `API_PROXY_ENABLED=true` and
 * `NEXT_PUBLIC_API_MODE=proxy` when either is true:
 *
 *   - You cannot add CORS headers to the Node API.
 *   - The access token must never be readable by JavaScript.
 *
 * This deliberately does *not* re-implement the backend. It attaches the token,
 * forwards the request and streams the response back. Every route stays owned
 * by the Node API — see docs/architecture.md for when to prefer direct calls.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "content-length",
]);

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!serverEnv.API_PROXY_ENABLED) {
    return NextResponse.json(
      { code: "PROXY_DISABLED", message: "API proxying is not enabled." },
      { status: 404 },
    );
  }

  const { path } = await context.params;

  // Reject traversal attempts before they reach the upstream URL.
  if (path.some((segment) => segment === ".." || segment.includes("\\"))) {
    return NextResponse.json({ code: "INVALID_PATH", message: "Invalid path." }, { status: 400 });
  }

  const target = `${serverEnv.API_URL.replace(/\/+$/, "")}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });

  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      signal: AbortSignal.timeout(serverEnv.API_TIMEOUT_MS),
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { code: "UPSTREAM_UNAVAILABLE", message: "The API is not reachable." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Never forward upstream Set-Cookie: this app owns its own session cookies.
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
