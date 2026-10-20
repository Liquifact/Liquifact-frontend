// Vitest's jsdom environment copies the typed-array / ArrayBuffer globals from
// the jsdom realm onto `globalThis`, while Node's `Buffer` and the bundled
// stellar-sdk keep using the main-realm constructors. That makes
// `Buffer.from(...)` fail `value instanceof Uint8Array` inside
// `@stellar/js-xdr`, so every transaction `toXDR()` throws
// "expected Uint8Array". Restoring the main-realm intrinsics (reachable
// through `Buffer`'s prototype chain) makes the two agree again.
const mainUint8Array = Object.getPrototypeOf(Buffer.prototype).constructor;
const mainArrayBuffer = new mainUint8Array(0).buffer.constructor;

globalThis.Uint8Array = mainUint8Array;
globalThis.ArrayBuffer = mainArrayBuffer;
