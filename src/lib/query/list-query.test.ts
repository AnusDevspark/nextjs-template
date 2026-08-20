import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  getActiveFilters,
  parseListQuery,
  serializeListQuery,
} from "./list-query";

/**
 * URL parsing is the foundation the list engine stands on: it runs on the
 * server and in the browser, and both must agree or the prefetch and the client
 * query would use different cache keys.
 */
describe("parseListQuery", () => {
  it("applies defaults when the URL is empty", () => {
    const query = parseListQuery(new URLSearchParams(), {
      defaultPageSize: 20,
      defaultSort: { field: "createdAt", order: "desc" },
    });

    expect(query).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(query.search).toBeUndefined();
  });

  it("reads page, size, search and sort from the URL", () => {
    const query = parseListQuery(
      new URLSearchParams("page=3&pageSize=50&search=john&sortBy=lastName&sortOrder=asc"),
    );

    expect(query).toMatchObject({
      page: 3,
      pageSize: 50,
      search: "john",
      sortBy: "lastName",
      sortOrder: "asc",
    });
  });

  it("clamps hostile pagination values instead of forwarding them", () => {
    const query = parseListQuery(new URLSearchParams("page=-5&pageSize=99999"));

    expect(query.page).toBe(1);
    // The API's hard cap. It answers a 400 rather than clamping, so anything
    // larger reaching it would surface as a validation error on a page the user
    // has no way to fix.
    expect(query.pageSize).toBe(100);
  });

  it("falls back to defaults for non-numeric pagination", () => {
    const query = parseListQuery(new URLSearchParams("page=abc&pageSize=1.5"), {
      defaultPageSize: 25,
    });

    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(25);
  });

  it("ignores an invalid sort order but keeps the field", () => {
    const query = parseListQuery(new URLSearchParams("sortBy=name&sortOrder=sideways"), {
      defaultSort: { field: "createdAt", order: "desc" },
    });

    expect(query.sortBy).toBe("name");
    expect(query.sortOrder).toBe("desc");
  });

  it("reads only declared filter keys", () => {
    const query = parseListQuery(new URLSearchParams("status=ACTIVE&injected=evil"), {
      filterKeys: ["status"],
    });

    expect(query.status).toBe("ACTIVE");
    expect(query.injected).toBeUndefined();
  });

  it("collects repeated params for multi-value keys", () => {
    const query = parseListQuery(new URLSearchParams("tag=A&tag=B"), {
      filterKeys: ["tag"],
      multiValueKeys: ["tag"],
    });

    expect(query.tag).toEqual(["A", "B"]);
  });

  it("accepts the plain object shape a Server Component receives", () => {
    const query = parseListQuery(
      { page: "2", search: "smith", status: "ACTIVE" },
      { filterKeys: ["status"] },
    );

    expect(query).toMatchObject({ page: 2, search: "smith", status: "ACTIVE" });
  });

  it("treats a whitespace-only search as no search", () => {
    expect(parseListQuery(new URLSearchParams("search=%20%20")).search).toBeUndefined();
  });
});

describe("serializeListQuery", () => {
  it("omits values that equal the defaults, keeping URLs short", () => {
    const params = serializeListQuery(
      { page: 1, pageSize: 20, sortBy: "createdAt", sortOrder: "desc" },
      { defaultPageSize: 20, defaultSort: { field: "createdAt", order: "desc" } },
    );

    expect(params.toString()).toBe("");
  });

  it("writes non-default values", () => {
    const params = serializeListQuery(
      { page: 2, pageSize: 50, search: "ada", sortBy: "name", sortOrder: "asc" },
      { defaultPageSize: 20 },
    );

    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("50");
    expect(params.get("search")).toBe("ada");
    expect(params.get("sortBy")).toBe("name");
  });

  it("repeats a key for array filters", () => {
    const params = serializeListQuery({
      page: 1,
      pageSize: 20,
      tag: ["A", "B"],
    });

    expect(params.getAll("tag")).toEqual(["A", "B"]);
  });

  it("round-trips through parse without drift", () => {
    const config = { defaultPageSize: 20, filterKeys: ["status"], multiValueKeys: [] };
    const original = parseListQuery(new URLSearchParams("page=3&search=x&status=ACTIVE"), config);

    expect(parseListQuery(serializeListQuery(original, config), config)).toEqual(original);
  });
});

describe("getActiveFilters", () => {
  it("excludes pagination and sort", () => {
    const filters = getActiveFilters({
      page: 2,
      pageSize: 20,
      search: "x",
      sortBy: "name",
      sortOrder: "asc",
      status: "ACTIVE",
    });

    expect(filters).toEqual({ status: "ACTIVE" });
  });

  it("counts search as an active filter", () => {
    expect(countActiveFilters({ page: 1, pageSize: 20, search: "x", status: "A" })).toBe(2);
    expect(countActiveFilters({ page: 1, pageSize: 20 })).toBe(0);
  });
});
