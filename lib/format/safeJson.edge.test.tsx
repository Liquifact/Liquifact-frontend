import { truncateString, limitDepth, extractKnownFields, safeJsonStringify } from "./safeJson";

describe("safeJson edge cases and boundaries", () => {
  /* ───────── truncateString Edge Cases ───────── */
  describe("truncateString boundaries & coercion", () => {
    it("does not truncate if length is exactly maxLength", () => {
      const str = "a".repeat(10);
      expect(truncateString(str, 10)).toBe(str);
    });

    it("does not truncate if length is exactly maxLength - 1", () => {
      const str = "a".repeat(9);
      expect(truncateString(str, 10)).toBe(str);
    });

    it("truncates if length is exactly maxLength + 1", () => {
      const str = "a".repeat(11);
      expect(truncateString(str, 10)).toBe("a".repeat(10) + "…(truncated)");
    });

    it("handles small maxLength like 0", () => {
      expect(truncateString("abc", 0)).toBe("…(truncated)");
      expect(truncateString("", 0)).toBe("");
    });

    it("coerces various primitives and structures to string before checking length", () => {
      expect(truncateString(12345, 4)).toBe("1234" + "…(truncated)");
      expect(truncateString(true, 3)).toBe("tru" + "…(truncated)");
      expect(truncateString(false, 10)).toBe("false");
      expect(truncateString({ toString: () => "custom" }, 4)).toBe("cust" + "…(truncated)");
    });

    it("handles empty and default input cases", () => {
      expect(truncateString(null)).toBe("");
      expect(truncateString(undefined)).toBe("");
      expect(truncateString("")).toBe("");
    });
  });

  /* ───────── limitDepth Edge Cases ───────── */
  describe("limitDepth boundaries & complex structures", () => {
    it("stops exactly at maxDepth and replaces deeper nodes", () => {
      // depth 0: parent object
      // depth 1: key 'a'
      // depth 2: key 'b'
      // depth 3: key 'c'
      // depth 4: key 'd'
      // depth 5: key 'e'
      // depth 6: key 'f' -> should be replaced when maxDepth is 5
      const deep = {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: { g: "too deep" },
                },
              },
            },
          },
        },
      };

      const result = limitDepth(deep, 5) as any;
      expect(result.a.b.c.d.e.f).toBe("[Depth limit reached]");
    });

    it("allows nesting exactly equal to maxDepth", () => {
      const deep = {
        a: {
          b: {
            c: {
              d: {
                e: "at limit",
              },
            },
          },
        },
      };
      const result = limitDepth(deep, 5) as any;
      expect(result.a.b.c.d.e).toBe("at limit");
    });

    it("handles arrays at depth limits", () => {
      // depth 0: array
      // depth 1: [0]
      // depth 2: [0][0]
      // depth 3: [0][0][0] -> replaced when maxDepth is 2
      const arr = [[[["deep"]]]];
      const result = limitDepth(arr, 2) as any;
      expect(result[0][0][0]).toBe("[Depth limit reached]");
    });

    it("handles custom maxDepth parameter including zero", () => {
      const obj = { a: 1, b: { c: 2 } };
      expect(limitDepth(obj, 0)).toEqual({ a: 1, b: "[Depth limit reached]" });
      expect(limitDepth(obj, 1)).toEqual({ a: 1, b: { c: 2 } });

      const nestedObj = { a: 1, b: { c: { d: 3 } } };
      expect(limitDepth(nestedObj, 1)).toEqual({ a: 1, b: { c: "[Depth limit reached]" } });
    });

    it("detects circular references in complex nested objects", () => {
      const obj: any = { name: "parent" };
      obj.child = { parent: obj };

      const result = limitDepth(obj, 5) as any;
      expect(result.name).toBe("parent");
      expect(result.child.parent).toBe("[Circular]");
    });

    it("detects circular references in nested arrays", () => {
      const arr: any[] = [];
      arr.push(arr);

      const result = limitDepth(arr, 5) as any;
      expect(result[0]).toBe("[Circular]");
    });

    it("handles multiple distinct circular references", () => {
      const first: any = {};
      first.self = first;

      const second: any = {};
      second.self = second;

      const parent = { first, second };
      const result = limitDepth(parent, 5) as any;
      expect(result.first.self).toBe("[Circular]");
      expect(result.second.self).toBe("[Circular]");
    });

    it("handles shared non-circular references (DAG) - documenting current WeakSet behavior", () => {
      // Because seenSet is passed down and shared between siblings,
      // a sibling object that is encountered again gets marked as [Circular] even if it is not.
      const shared = { val: 42 };
      const obj = { a: shared, b: shared };

      const result = limitDepth(obj, 5) as any;
      expect(result.a).toEqual({ val: 42 });
      expect(result.b).toBe("[Circular]"); // Asserts the current behavior of the shared WeakSet
    });

    it("passes through functions and symbols unchanged", () => {
      const fn = () => {};
      const sym = Symbol("test");
      expect(limitDepth(fn, 5)).toBe(fn);
      expect(limitDepth(sym, 5)).toBe(sym);
    });

    it("returns empty and primitive inputs unmodified", () => {
      expect(limitDepth(null)).toBeNull();
      expect(limitDepth(undefined)).toBeUndefined();
      expect(limitDepth(42)).toBe(42);
      expect(limitDepth("hello")).toBe("hello");
      expect(limitDepth(true)).toBe(true);
    });
  });

  /* ───────── safeJsonStringify Edge Cases ───────── */
  describe("safeJsonStringify edge cases & fallback behavior", () => {
    it("truncates to default maxLength (2000)", () => {
      const largeObj = { data: "x".repeat(3000) };
      const result = safeJsonStringify(largeObj);
      expect(result.endsWith("…(truncated)")).toBe(true);
      expect(result.length).toBe(2000 + "…(truncated)".length);
    });

    it("handles zero or very small custom maxLength", () => {
      const result = safeJsonStringify({ a: 1 }, { maxLength: 5 });
      expect(result).toBe('{\n  "' + "…(truncated)");
    });

    it("handles deep objects and formats [Depth limit reached] correctly", () => {
      const deep = { a: { b: { c: { d: { e: { f: "too deep" } } } } } };
      const result = safeJsonStringify(deep, { maxDepth: 4 });
      expect(result).toContain('"[Depth limit reached]"');
      expect(result).not.toContain("too deep");
    });

    it("gracefully handles circular references in JSON serialization", () => {
      const obj: any = {};
      obj.self = obj;
      const result = safeJsonStringify(obj);
      expect(result).toContain('"self": "[Circular]"');
    });

    it("handles top-level non-serializable values (functions, symbols, BigInts)", () => {
      const fn = () => {};
      expect(safeJsonStringify(fn)).toBe(""); // JSON.stringify(fn) returns undefined, coerced to empty string

      const sym = Symbol("test");
      expect(safeJsonStringify(sym)).toBe(""); // JSON.stringify(sym) returns undefined, coerced to empty string

      // Top level BigInt: JSON.stringify(10n) throws TypeError, falls back to String(10n) -> "10"
      expect(safeJsonStringify(10n)).toBe("10");
    });

    it("handles nested functions and symbols", () => {
      const obj = {
        fn: () => {},
        sym: Symbol("nested"),
        arr: [() => {}, Symbol("array")],
      };
      const result = safeJsonStringify(obj);
      // Nested functions/symbols in object are omitted, in arrays they become null
      expect(result).not.toContain("fn");
      expect(result).not.toContain("sym");
      expect(result).toContain("null");
    });

    it("handles nested BigInts with standard fallback to String()", () => {
      // BigInt in nested object will throw TypeError in JSON.stringify,
      // falling back to String(obj) -> "[object Object]"
      const nestedBigInt = { val: 42n };
      const result = safeJsonStringify(nestedBigInt);
      expect(result).toBe("[object Object]");
    });

    it("handles NaN and Infinity values (which JSON.stringify serializes to null)", () => {
      const obj = { nan: NaN, inf: Infinity };
      const result = safeJsonStringify(obj);
      expect(result).toContain('"nan": null');
      expect(result).toContain('"inf": null');
    });

    it("handles top-level primitive values", () => {
      expect(safeJsonStringify(42)).toBe("42");
      expect(safeJsonStringify("hello")).toBe('"hello"');
      expect(safeJsonStringify(true)).toBe("true");
      expect(safeJsonStringify(null)).toBe("null");
      expect(safeJsonStringify(undefined)).toBe("undefined");
    });
  });

  /* ───────── extractKnownFields Edge Cases ───────── */
  describe("extractKnownFields edge cases", () => {
    it("returns empty object if target object is null, undefined, primitive, or array", () => {
      expect(extractKnownFields(null)).toEqual({});
      expect(extractKnownFields(undefined)).toEqual({});
      expect(extractKnownFields(42)).toEqual({});
      expect(extractKnownFields("string")).toEqual({});
      expect(extractKnownFields([])).toEqual({});
    });

    it("handles empty custom fields array", () => {
      const obj = { status: "ok", message: "test" };
      expect(extractKnownFields(obj, [])).toEqual({});
    });

    it("correctly extracts non-enumerable or inherited properties if they exist using in operator", () => {
      const proto = { inherited: "yes" };
      const obj = Object.create(proto);
      obj.own = "no";

      expect(extractKnownFields(obj, ["inherited", "own"])).toEqual({
        inherited: "yes",
        own: "no",
      });
    });
  });
});
