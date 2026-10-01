import {
  healthReducer,
  initialHealthState,
  classifyFailure,
  STATUS,
  FAILURE_REASON,
} from "./healthState";

const loading = (id = 1) => ({ status: STATUS.LOADING, requestId: id, payload: null, reason: null });

describe("allowed transitions", () => {
  it("idle -> loading on START", () => {
    expect(healthReducer(initialHealthState, { type: "START" })).toEqual(loading(1));
  });
  it("loading -> connected on matching SUCCESS", () => {
    const s = healthReducer(loading(1), { type: "SUCCESS", requestId: 1, payload: { status: "ok" } });
    expect(s.status).toBe(STATUS.CONNECTED);
    expect(s.payload).toEqual({ status: "ok" });
  });
  it("loading -> degraded on matching DEGRADED", () => {
    const s = healthReducer(loading(1), { type: "DEGRADED", requestId: 1, payload: { status: "err" } });
    expect(s.status).toBe(STATUS.DEGRADED);
    expect(s.reason).toBe(FAILURE_REASON.HTTP_ERROR);
  });
  it("loading -> unreachable on matching FAILURE", () => {
    const s = healthReducer(loading(1), { type: "FAILURE", requestId: 1, reason: FAILURE_REASON.TIMEOUT });
    expect(s).toMatchObject({ status: STATUS.UNREACHABLE, reason: FAILURE_REASON.TIMEOUT, payload: null });
  });
  it("terminal -> loading on START with incremented requestId", () => {
    const done = { status: STATUS.CONNECTED, requestId: 1, payload: {}, reason: null };
    expect(healthReducer(done, { type: "START" })).toEqual(loading(2));
  });
});

describe("forbidden transitions / invariants", () => {
  it("duplicate START while loading is a no-op", () => {
    const s = loading(3);
    expect(healthReducer(s, { type: "START" })).toBe(s);
  });
  it("stale result (old requestId) is ignored", () => {
    const s = loading(2);
    expect(healthReducer(s, { type: "SUCCESS", requestId: 1, payload: {} })).toBe(s);
  });
  it("result while not loading is ignored", () => {
    expect(healthReducer(initialHealthState, { type: "SUCCESS", requestId: 0, payload: {} })).toBe(initialHealthState);
    const done = { status: STATUS.UNREACHABLE, requestId: 1, payload: null, reason: "network" };
    expect(healthReducer(done, { type: "SUCCESS", requestId: 1, payload: {} })).toBe(done);
  });
  it("late second result cannot overwrite the first", () => {
    let s = healthReducer(loading(1), { type: "SUCCESS", requestId: 1, payload: { a: 1 } });
    s = healthReducer(s, { type: "FAILURE", requestId: 1, reason: "timeout" });
    expect(s.status).toBe(STATUS.CONNECTED);
  });
  it("unknown action / null action / corrupt state are deterministic no-ops or reset to idle", () => {
    expect(healthReducer(initialHealthState, { type: "NOPE" })).toBe(initialHealthState);
    expect(healthReducer(initialHealthState, null)).toBe(initialHealthState);
    expect(healthReducer({ status: "garbage" }, { type: "START" })).toEqual(loading(1));
  });
  it("failure reason outside the whitelist is stored as 'unknown'", () => {
    const s = healthReducer(loading(1), { type: "FAILURE", requestId: 1, reason: "secret token abc123" });
    expect(s.reason).toBe(FAILURE_REASON.UNKNOWN);
    expect(JSON.stringify(s)).not.toContain("abc123");
  });
});

describe("classifyFailure", () => {
  it.each([
    [Object.assign(new Error("x"), { name: "AbortError" }), FAILURE_REASON.TIMEOUT],
    [new SyntaxError("bad json"), FAILURE_REASON.BAD_JSON],
    [new TypeError("Failed to fetch"), FAILURE_REASON.NETWORK],
    [new Error("weird"), FAILURE_REASON.UNKNOWN],
    [null, FAILURE_REASON.UNKNOWN],
  ])("%p -> %s", (err, code) => expect(classifyFailure(err)).toBe(code));

  it("never returns the raw message", () => {
    expect(classifyFailure(new Error("password=hunter2"))).not.toContain("hunter2");
  });
});

describe("determinism", () => {
  it("same state + action always gives the same result", () => {
    const a = healthReducer(loading(4), { type: "SUCCESS", requestId: 4, payload: { x: 1 } });
    const b = healthReducer(loading(4), { type: "SUCCESS", requestId: 4, payload: { x: 1 } });
    expect(a).toEqual(b);
  });
});

describe("normalizeHealthResult", () => {
  it("passes a valid result through and keeps extra fields", () => {
    const r = normalizeHealthResult({ status: "connected", message: "ok", details: { version: "1" } });
    expect(r).toEqual({ status: "connected", message: "ok", details: { version: "1" } });
  });
  it.each([null, undefined, "str", 5, []])("non-object %p -> unreachable", (v) => {
    expect(normalizeHealthResult(v)).toEqual({ status: "unreachable", message: "" });
  });
  it("unknown status -> degraded", () => {
    expect(normalizeHealthResult({ status: "<script>", message: "x" }).status).toBe("degraded");
    expect(normalizeHealthResult({ message: "x" }).status).toBe("degraded");
  });
  it("non-string message -> empty string", () => {
    expect(normalizeHealthResult({ status: "connected", message: { a: 1 } }).message).toBe("");
  });
  it("boundary: message capped at 500 chars", () => {
    expect(normalizeHealthResult({ status: "connected", message: "a".repeat(500) }).message).toHaveLength(500);
    expect(normalizeHealthResult({ status: "connected", message: "a".repeat(501) }).message).toHaveLength(500);
  });
});