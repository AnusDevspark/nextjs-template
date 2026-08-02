import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { getPathname, getSearchParams, resetRouterMock, routerMock } from "./router-mock";
import { server } from "./msw/server";

/**
 * Global test setup.
 *
 * Mocks the two browser APIs jsdom does not implement but Radix relies on, and
 * swaps the Next.js router for a recording stub. Everything else — fetch, the
 * query client, the components themselves — runs for real, so the tests
 * exercise the actual code paths.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => getPathname(),
  useSearchParams: () => getSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// jsdom has no layout engine, so Radix's positioning hooks need these.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Used by Radix Select / DropdownMenu.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();

  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetRouterMock();
  vi.clearAllTimers();
});

afterAll(() => {
  server.close();
});
