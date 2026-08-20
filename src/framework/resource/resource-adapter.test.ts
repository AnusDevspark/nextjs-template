import { describe, expect, it } from "vitest";

import { defineResource, getStandardActions } from "./define-resource";
import {
  buildPageMeta,
  emptyListResult,
  pick,
  toListResult,
  toQueryParams,
  toUnknownTotalResult,
} from "./resource-adapter";

describe("buildPageMeta", () => {
  it("derives totalPages when the backend omits it", () => {
    expect(buildPageMeta({ page: 1, pageSize: 20, total: 45 }).totalPages).toBe(3);
  });

  it("prefers the backend's totalPages when present", () => {
    expect(buildPageMeta({ page: 1, pageSize: 20, total: 45, totalPages: 5 }).totalPages).toBe(5);
  });

  it("reports one page when there are no records, so pagination stays sane", () => {
    expect(buildPageMeta({ page: 1, pageSize: 20, total: 0 }).totalPages).toBe(1);
  });

  it("guards against a zero page size", () => {
    expect(buildPageMeta({ page: 1, pageSize: 0, total: 40 }).pageSize).toBe(20);
  });
});

describe("toListResult", () => {
  it("normalizes a null item list to an empty array", () => {
    expect(toListResult(null, { page: 1, pageSize: 20, total: 0 }).items).toEqual([]);
  });

  it("keeps items untouched", () => {
    const items = [{ id: "1" }];
    expect(toListResult(items, { page: 1, pageSize: 20, total: 1 }).items).toBe(items);
  });
});

describe("toUnknownTotalResult", () => {
  it("signals one more page when the current page came back full", () => {
    const result = toUnknownTotalResult(
      Array.from({ length: 20 }, (_, i) => i),
      {
        page: 2,
        pageSize: 20,
      },
    );

    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.total).toBe(41);
  });

  it("stops paginating when the page is short", () => {
    const result = toUnknownTotalResult([1, 2, 3], { page: 2, pageSize: 20 });

    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.total).toBe(23);
  });
});

describe("emptyListResult", () => {
  it("produces a valid single-page result", () => {
    expect(emptyListResult({ page: 1, pageSize: 20 }).meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    });
  });
});

describe("toQueryParams", () => {
  it("renames keys the backend spells differently", () => {
    expect(toQueryParams({ page: 1, search: "ada" }, { search: "q" })).toEqual({
      page: 1,
      q: "ada",
    });
  });

  it("drops undefined, null and empty arrays", () => {
    expect(toQueryParams({ page: 1, search: undefined, status: null, tags: [] })).toEqual({
      page: 1,
    });
  });

  it("keeps array values with entries", () => {
    expect(toQueryParams({ tag: ["A", "B"] })).toEqual({ tag: ["A", "B"] });
  });
});

describe("pick", () => {
  it("returns the first present key", () => {
    expect(pick({ totalElements: 5 }, ["total", "totalElements", "count"], 0)).toBe(5);
  });

  it("falls back when nothing matches", () => {
    expect(pick({}, ["total"], 0)).toBe(0);
    expect(pick(null, ["total"], 0)).toBe(0);
  });
});

/**
 * Capabilities are derived from the API rather than declared twice. A read-only
 * resource should get no create button and no delete action with no extra
 * configuration — that is what makes partial-CRUD modules cheap.
 */
describe("defineResource capabilities", () => {
  const readOnly = defineResource({
    key: "auditLog",
    name: "Audit log",
    pluralName: "Audit logs",
    getId: (entity: { id: string }) => entity.id,
    getLabel: (entity: { id: string }) => entity.id,
    routes: { list: "/audit", detail: (id) => `/audit/${id}` },
    permissions: {},
    api: {
      list: async () => ({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
      getById: async () => ({ id: "1" }),
    },
    list: { columns: [] },
  });

  it("disables write capabilities when the adapter has no write methods", () => {
    expect(readOnly.capabilities).toEqual({
      create: false,
      edit: false,
      delete: false,
      detail: true,
      export: false,
    });
  });

  it("offers only the view action for a read-only resource", () => {
    expect(getStandardActions(readOnly)).toEqual(["view"]);
  });

  it("respects an explicit capability override", () => {
    const noDelete = defineResource({
      ...readOnly,
      capabilities: { detail: false },
    });

    expect(noDelete.capabilities.detail).toBe(false);
    expect(getStandardActions(noDelete)).toEqual([]);
  });
});
