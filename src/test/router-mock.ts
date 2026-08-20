import { vi } from "vitest";

/**
 * A controllable stand-in for the Next.js App Router.
 *
 * The framework's URL state is the thing most worth testing — "does changing
 * the page write the right search params?" — so the mock records navigation
 * calls rather than trying to simulate a router. Assertions read the recorded
 * URL, which is both simpler and more precise than inspecting a fake history.
 */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

let pathname = "/users";
let searchParams = new URLSearchParams();

export function setPathname(next: string): void {
  pathname = next;
}

export function setSearchParams(next: string | URLSearchParams): void {
  searchParams = typeof next === "string" ? new URLSearchParams(next) : next;
}

export function getPathname(): string {
  return pathname;
}

export function getSearchParams(): URLSearchParams {
  return searchParams;
}

export function resetRouterMock(): void {
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  routerMock.refresh.mockReset();
  routerMock.back.mockReset();
  routerMock.forward.mockReset();
  routerMock.prefetch.mockReset();

  pathname = "/users";
  searchParams = new URLSearchParams();
}

/** The search string of the most recent `router.replace` call. */
export function lastReplacedSearchParams(): URLSearchParams {
  const calls = routerMock.replace.mock.calls;
  if (calls.length === 0) return new URLSearchParams();

  const url = String(calls[calls.length - 1]![0]);
  const queryIndex = url.indexOf("?");

  return new URLSearchParams(queryIndex === -1 ? "" : url.slice(queryIndex + 1));
}
