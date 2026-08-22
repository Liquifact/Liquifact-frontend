import { normalizePaginationParams } from "./Pagination";

describe("normalizePaginationParams", () => {
  it("coerces numeric strings and clamps them to safe bounds", () => {
    expect(
      normalizePaginationParams({
        page: "3",
        pageSize: "15",
        totalItems: 25,
        defaultPageSize: 10,
      })
    ).toEqual({
      page: 2,
      pageSize: 15,
      totalPages: 2,
    });
  });

  it("falls back to defaults for missing or malformed values", () => {
    expect(
      normalizePaginationParams({
        page: "abc",
        pageSize: "0",
        totalItems: 4,
        defaultPageSize: 10,
      })
    ).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it("never allows the page number to exceed the available pages", () => {
    expect(
      normalizePaginationParams({
        page: "99",
        pageSize: "5",
        totalItems: 12,
        defaultPageSize: 10,
      })
    ).toEqual({
      page: 3,
      pageSize: 5,
      totalPages: 3,
    });
  });
});
