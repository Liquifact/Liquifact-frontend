import { truncateString, limitDepth, extractKnownFields, safeJsonStringify } from "./safeJson";

/* ───────── truncateString ───────── */

describe("truncateString", () => {
  it("keeps short strings unchanged", () => {
    expect(truncateString("hello", 10)).toBe("hello");
  });

  it("truncates long strings with marker", () => {
    const result = truncateString("a".repeat(100), 10);
    expect(result).toBe("a".repeat(10) + "…(truncated)");
    expect(result.length).toBe(10 + "…(truncated)".length);
  });

  it("returns empty string for empty input", () => {
    expect(truncateString("", 10)).toBe("");
  });

  it("coerces non-string values", () => {
    expect(truncateString(42, 10)).toBe("42");
    expect(truncateString(null, 10)).toBe("");
    expect(truncateString(undefined, 10)).toBe("");
  });
});

/* ───────── limitDepth ───────── */

describe("limitDepth", () => {
  it("passes through shallow objects unchanged", () => {
    const obj = { a: 1, b: "two", c: true };
    expect(limitDepth(obj, 5)).toEqual(obj);
  });

  it("replaces nodes beyond maxDepth", () => {
    const deep = { a: { b: { c: { d: { e: "too deep" } } } } };
    const result = limitDepth(deep, 2);
    expect(result.a.b.c).toBe("[Depth limit reached]");
  });

  it("handles arrays within depth", () => {
    const obj = { items: [1, 2, { x: "y" }] };
    const result = limitDepth(obj, 3);
    expect(result).toEqual(obj);
  });

  it("replaces array items beyond depth", () => {
    const deep = { arr: [{ nested: { deep: { val: 1 } } }] };
    const result = limitDepth(deep, 2);
    expect(result.arr[0].nested).toBe("[Depth limit reached]");
  });

  it("preserves null and primitive values", () => {
    const obj = { a: null, b: undefined, c: 0, d: "", e: false };
    expect(limitDepth(obj, 5)).toEqual(obj);
  });

  it("handles circular references without throwing", () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = limitDepth(obj, 5);
    expect(result.a).toBe(1);
    expect(result.self).toBe("[Circular]");
  });

  it("handles null and undefined input", () => {
    expect(limitDepth(null)).toBeNull();
    expect(limitDepth(undefined)).toBeUndefined();
  });

  it("handles top-level arrays", () => {
    const arr = [1, [2, [3]]];
    const result = limitDepth(arr, 1);
    expect(result[0]).toBe(1);
    expect(result[1][0]).toBe(2);
    expect(result[1][1]).toBe("[Depth limit reached]");
  });
});

/* ───────── extractKnownFields ───────── */

describe("extractKnownFields", () => {
  it("picks only requested fields", () => {
    const obj = { status: "ok", message: "all good", version: "1.0", extra: "secret" };
    expect(extractKnownFields(obj)).toEqual({
      status: "ok",
      message: "all good",
      version: "1.0",
    });
  });

  it("omits missing fields", () => {
    expect(extractKnownFields({ status: "ok" })).toEqual({ status: "ok" });
  });

  it("returns empty object for null, undefined, array, or primitive", () => {
    expect(extractKnownFields(null)).toEqual({});
    expect(extractKnownFields(undefined)).toEqual({});
    expect(extractKnownFields([])).toEqual({});
    expect(extractKnownFields("string")).toEqual({});
  });

  it("accepts custom field list", () => {
    const obj = { foo: 1, bar: 2, baz: 3 };
    expect(extractKnownFields(obj, ["foo", "baz"])).toEqual({ foo: 1, baz: 3 });
  });
});

/* ───────── safeJsonStringify ───────── */

describe("safeJsonStringify", () => {
  it("stringifies a normal object within limits", () => {
    const obj = { status: "ok", message: "healthy" };
    const result = safeJsonStringify(obj);
    expect(result).toContain('"status"');
    expect(result).toContain('"ok"');
  });

  it("truncates output exceeding maxLength", () => {
    const big = { data: "x".repeat(3000) };
    const result = safeJsonStringify(big, { maxLength: 50 });
    expect(result.endsWith("…(truncated)")).toBe(true);
    expect(result.length).toBeLessThan(70);
  });

  it("limits depth in output", () => {
    const deep = { a: { b: { c: { d: { e: "deep" } } } } };
    const result = safeJsonStringify(deep, { maxDepth: 2 });
    expect(result).toContain("[Depth limit reached]");
  });

  it("handles null and undefined input", () => {
    expect(safeJsonStringify(null)).toBe("null");
    expect(safeJsonStringify(undefined)).toBe("undefined");
  });

  it("cooperates with custom maxLength", () => {
    const obj = { status: "ok", message: "a".repeat(500) };
    const result = safeJsonStringify(obj, { maxLength: 100 });
    expect(result.endsWith("…(truncated)")).toBe(true);
  });
});
