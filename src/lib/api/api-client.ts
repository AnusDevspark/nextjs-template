import { ApiError, parseApiError, toNetworkError } from "@/lib/errors";

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>;
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  /** Appended to the URL. `undefined`, `null` and `""` entries are dropped. */
  query?: QueryParams;
  /** Plain objects are JSON-encoded. `FormData`/`Blob` are passed through. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Overrides the client default. */
  timeoutMs?: number;
  /**
   * Set `false` for endpoints that must not trigger the refresh-and-retry
   * flow — the refresh call itself, for instance.
   */
  retryOnUnauthorized?: boolean;
  /** Passed straight to `fetch`. Only meaningful on the server. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * The transport contract resource adapters are written against.
 *
 * Adapters receive an `ApiClient` rather than importing one, which is what lets
 * the same adapter run in a Server Component (`serverApi`) and in a TanStack
 * Query hook (`clientApi`) without branching.
 */
export interface ApiClient {
  request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Returns the raw `Response` — needed for file downloads. */
  raw(method: HttpMethod, path: string, options?: RequestOptions): Promise<Response>;
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultTimeoutMs?: number;
  /** Sent with every request. Resolved per-request so tokens stay fresh. */
  getHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  /** Browsers need `include` for cross-origin cookies; the server ignores it. */
  credentials?: RequestCredentials;
  /**
   * Called once when a request comes back 401. Return `true` if the caller
   * should retry (i.e. a refresh succeeded). Implementations must be
   * single-flight — see `client-api.ts`.
   */
  onUnauthorized?: () => Promise<boolean>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const defaultTimeoutMs = config.defaultTimeoutMs ?? 15_000;

  async function raw(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const url = buildUrl(config.baseUrl, path, options.query);

    const headers = new Headers({
      Accept: "application/json",
      ...(await config.getHeaders?.()),
      ...options.headers,
    });

    const body = serializeBody(options.body, headers);
    const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

    // `AbortSignal.any` lets a caller-supplied signal (React Query cancelling a
    // stale query) and the timeout both abort the same request.
    const signals: AbortSignal[] = [AbortSignal.timeout(timeoutMs)];
    if (options.signal) signals.push(options.signal);

    const init: RequestInit = {
      method,
      headers,
      body,
      signal: AbortSignal.any(signals),
      credentials: config.credentials,
      ...(options.cache ? { cache: options.cache } : {}),
      ...(options.next ? { next: options.next } : {}),
    };

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw toNetworkError(error);
    }

    const canRetry = options.retryOnUnauthorized !== false && Boolean(config.onUnauthorized);

    if (response.status === 401 && canRetry) {
      const refreshed = await config.onUnauthorized!();
      if (refreshed) {
        // Rebuild headers so the retry picks up the new token.
        const retryHeaders = new Headers({
          Accept: "application/json",
          ...(await config.getHeaders?.()),
          ...options.headers,
        });
        const retryBody = serializeBody(options.body, retryHeaders);

        try {
          response = await fetch(url, {
            ...init,
            headers: retryHeaders,
            body: retryBody,
            signal: AbortSignal.any([
              AbortSignal.timeout(timeoutMs),
              ...(options.signal ? [options.signal] : []),
            ]),
          });
        } catch (error) {
          throw toNetworkError(error);
        }
      }
    }

    if (!response.ok) {
      throw await parseApiError(response);
    }

    return response;
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await raw(method, path, options);
    return (await readJson<T>(response)) as T;
  }

  return {
    raw,
    request,
    get: (path, options) => request("GET", path, options),
    post: (path, body, options) => request("POST", path, { ...options, body }),
    put: (path, body, options) => request("PUT", path, { ...options, body }),
    patch: (path, body, options) => request("PATCH", path, { ...options, body }),
    delete: (path, options) => request("DELETE", path, options),
  };
}

/**
 * Joins base and path without collapsing a base path segment.
 *
 * `new URL("/providers", "http://x/api/v1")` yields `http://x/providers`, which
 * silently drops the version prefix — a bug worth avoiding by hand.
 */
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const base = baseUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const search = serializeQuery(query);
  return `${base}${suffix}${search}`;
}

/**
 * `?page=1&status=ACTIVE&tag=a&tag=b`
 *
 * Empty strings, `null` and `undefined` are omitted so a cleared filter
 * disappears from the URL instead of sending `status=`.
 */
export function serializeQuery(query?: QueryParams): string {
  if (!query) return "";

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry !== undefined && entry !== null && entry !== "") {
          params.append(key, String(entry));
        }
      }
      continue;
    }

    params.append(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams ||
    typeof body === "string"
  ) {
    // Let the browser set the multipart boundary itself.
    return body as BodyInit;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return JSON.stringify(body);
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204 || response.status === 205) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiError({
      status: response.status,
      code: "INVALID_JSON",
      message: "The server returned a malformed response.",
      cause: error,
    });
  }
}
