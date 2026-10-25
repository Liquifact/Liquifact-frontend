import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DURATIONS, MAX_VISIBLE, normalizeToast, reducer } from "../lib/toast/queue.js";

test("push assigns ids, kinds and default durations (errors are sticky)", () => {
  let s = reducer([], { type: "push", toast: { kind: "success", title: "Saved" } });
  s = reducer(s, { type: "push", toast: { kind: "error", title: "Nope" } });
  assert.equal(s.length, 2);
  assert.ok(s[0].id && s[1].id && s[0].id !== s[1].id);
  assert.equal(s[0].duration, DEFAULT_DURATIONS.success);
  assert.equal(s[1].duration, 0);
  assert.equal(normalizeToast({ kind: "weird" }).kind, "info");
});

test("pushing an existing id de-duplicates in place", () => {
  let s = reducer([], { type: "push", toast: { id: "copy", title: "A" } });
  s = reducer(s, { type: "push", toast: { id: "copy", title: "B" } });
  assert.equal(s.length, 1);
  assert.equal(s[0].title, "B");
});

test("only the newest MAX_VISIBLE toasts are kept", () => {
  let s = [];
  for (let i = 0; i < MAX_VISIBLE + 2; i++) s = reducer(s, { type: "push", toast: { id: `t${i}`, title: `${i}` } });
  assert.equal(s.length, MAX_VISIBLE);
  assert.equal(s[s.length - 1].id, `t${MAX_VISIBLE + 1}`);
});

test("dismiss and clear", () => {
  let s = reducer([], { type: "push", toast: { id: "a", title: "A" } });
  s = reducer(s, { type: "push", toast: { id: "b", title: "B" } });
  s = reducer(s, { type: "dismiss", id: "a" });
  assert.deepEqual(s.map((t) => t.id), ["b"]);
  assert.deepEqual(reducer(s, { type: "clear" }), []);
  assert.equal(reducer(s, { type: "unknown" }), s);
});
