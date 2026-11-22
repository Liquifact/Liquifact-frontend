export function normalizeNetworkName(name) {
  if (!name) return null;
  const value = String(name).toLowerCase().trim();
  return value.includes("test") ? "testnet" : value;
}

export class NetworkMismatchError extends Error {
  constructor(expected, actual) {
    const normalizedExpected = normalizeNetworkName(expected);
    const normalizedActual = normalizeNetworkName(actual);
    super(`Wallet network mismatch: expected ${normalizedExpected ?? expected}, actual ${normalizedActual ?? actual ?? "unknown"}. Switch Freighter to the expected network before signing.`);
    this.name = "NetworkMismatchError";
    this.expected = normalizedExpected ?? expected;
    this.actual = normalizedActual ?? actual;
  }
}

export async function assertWalletNetwork({ getNetwork = async () => (await import("./freighter.js")).getNetworkName(), expected }) {
  const actual = await getNetwork();
  if (normalizeNetworkName(actual) !== normalizeNetworkName(expected)) {
    throw new NetworkMismatchError(expected, actual);
  }
  return actual;
}
