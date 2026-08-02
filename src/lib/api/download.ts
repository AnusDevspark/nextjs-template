"use client";

import { ApiError } from "@/lib/errors";

import type { ApiClient, QueryParams } from "./api-client";
import { clientApi } from "./client-api";

export interface DownloadOptions {
  query?: QueryParams;
  /** Overrides the filename from `Content-Disposition`. */
  filename?: string;
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  client?: ApiClient;
  /** Exports can be slow; default is generous. */
  timeoutMs?: number;
}

/**
 * Downloads a file from the API and hands it to the browser.
 *
 * Uses the normal API client so the request carries auth and produces an
 * `ApiError` on failure — a plain `window.open` would skip both and show a raw
 * JSON error page for an expired session.
 */
export async function downloadFile(path: string, options: DownloadOptions = {}): Promise<void> {
  const client = options.client ?? clientApi;

  const response = await client.raw(options.method ?? "GET", path, {
    query: options.query,
    body: options.body,
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? 120_000,
    headers: { Accept: "application/octet-stream, application/pdf, text/csv, */*" },
  });

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new ApiError({
      status: response.status,
      code: "EMPTY_DOWNLOAD",
      message: "The server returned an empty file.",
    });
  }

  const filename =
    options.filename ??
    filenameFromContentDisposition(response.headers.get("content-disposition")) ??
    "download";

  saveBlob(blob, filename);
}

/** Triggers a save without leaking the object URL. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Reads the filename from a `Content-Disposition` header.
 * Prefers RFC 5987 `filename*` (which carries an encoding) over plain
 * `filename`, so non-ASCII names survive.
 */
export function filenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;

  const extended = /filename\*=(?:UTF-8|utf-8)''([^;]+)/i.exec(header);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // Malformed percent-encoding — fall through to the plain form.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim();
}

/** Timestamped filename, e.g. `providers-2026-08-02.csv`. */
export function timestampedFilename(base: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${extension}`;
}
