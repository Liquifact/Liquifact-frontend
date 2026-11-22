export const DEFAULT_COOLDOWN_MS = 60_000;
export const ENDPOINT_COOLDOWN_MS = DEFAULT_COOLDOWN_MS;

export const DEFAULT_ENDPOINTS = {
  rpc: {
    testnet: ["https://soroban-testnet.stellar.org"],
    public: ["https://soroban-rpc.stellar.org"],
    mainnet: ["https://soroban-rpc.stellar.org"],
    pubnet: ["https://soroban-rpc.stellar.org"],
  },
  horizon: {
    testnet: ["https://horizon-testnet.stellar.org"],
    public: ["https://horizon.stellar.org"],
    mainnet: ["https://horizon.stellar.org"],
    pubnet: ["https://horizon.stellar.org"],
  },
};

const ENDPOINT_ENV_KEYS = {
  rpc: ["NEXT_PUBLIC_STELLAR_RPC_URL", "NEXT_PUBLIC_SOROBAN_RPC_URL", "SOROBAN_RPC_URL"],
  horizon: ["NEXT_PUBLIC_HORIZON_URL"],
};

const failureState = new Map();
let globalClock = () => Date.now();

export function readEndpointEnv() {
  return {
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    SOROBAN_RPC_URL: process.env.SOROBAN_RPC_URL,
    NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL,
  };
}

export function parseEndpoints(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set();
  const endpoints = [];
  for (const item of values) {
    const endpoint = String(item ?? "").trim();
    if (!endpoint || seen.has(endpoint)) continue;
    seen.add(endpoint);
    endpoints.push(endpoint);
  }
  return endpoints;
}

export const parseEndpointList = parseEndpoints;

export function getEndpoints(kind, { env, network, endpoints, defaults, defaultEndpoints } = {}) {
  const explicit = parseEndpoints(endpoints);
  if (explicit.length) return explicit;

  const environment = env ?? readEndpointEnv();
  for (const key of ENDPOINT_ENV_KEYS[kind] ?? []) {
    const configured = parseEndpoints(environment?.[key]);
    if (configured.length) return configured;
  }

  const selectedNetwork = network ?? environment?.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
  const fallback = defaults ?? defaultEndpoints ?? DEFAULT_ENDPOINTS[kind]?.[selectedNetwork] ?? DEFAULT_ENDPOINTS[kind]?.testnet ?? [];
  return parseEndpoints(fallback);
}

export const getEndpointPool = getEndpoints;

export const RPC_ENDPOINTS = getEndpoints("rpc");
export const HORIZON_ENDPOINTS = getEndpoints("horizon");

function endpointKey(kind, endpoint) {
  return `${kind}|${endpoint}`;
}

function resolveClock({ now, clock, getNow } = {}) {
  if (typeof now === "function") return now;
  if (typeof clock === "function") return clock;
  if (typeof clock?.now === "function") return () => clock.now();
  if (typeof getNow === "function") return getNow;
  return globalClock;
}

export function setEndpointClock(clock) {
  globalClock = typeof clock === "function" ? clock : typeof clock?.now === "function" ? () => clock.now() : () => Date.now();
}

export const setClock = setEndpointClock;

export function markEndpointFailure(kind, endpoint, at) {
  const key = endpointKey(kind, endpoint);
  const timestamp = typeof at === "number" ? at : globalClock();
  const current = failureState.get(key) ?? { failures: 0, failedAt: null };
  failureState.set(key, { failures: current.failures + 1, failedAt: timestamp });
}

export function getEndpointState(kind, endpoint) {
  return failureState.get(endpointKey(kind, endpoint)) ?? null;
}

export function resetEndpointFailures(kind) {
  if (!kind) {
    failureState.clear();
    return;
  }
  const prefix = `${kind}|`;
  for (const key of [...failureState.keys()]) {
    if (key.startsWith(prefix)) failureState.delete(key);
  }
}

export const resetFailures = resetEndpointFailures;

export function isEndpointCoolingDown(kind, endpoint, { now, clock, cooldownMs = DEFAULT_COOLDOWN_MS } = {}) {
  const state = getEndpointState(kind, endpoint);
  if (!state || state.failedAt == null) return false;
  const currentClock = resolveClock({ now, clock });
  return currentClock() - state.failedAt < cooldownMs;
}

function statusFromError(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
    error?.response?.statusCode,
    error?.cause?.status,
    error?.cause?.response?.status,
  ];
  for (const candidate of candidates) {
    const status = Number(candidate);
    if (Number.isFinite(status) && status >= 100 && status < 600) return status;
  }
  const message = String(error?.message ?? error ?? "");
  const match = message.match(/(?:\((5\d{2})\)|(?:status(?: code)?|HTTP)\s*:?\s*(5\d{2}))/i);
  return match ? Number(match[1] ?? match[2]) : null;
}

export function isRetryableError(error) {
  if (!error) return false;
  if (error.retryable === false || error.contractError === true || error.simulationError !== undefined) return false;
  if (error.retryable === true || error.failover === true) return true;

  const status = statusFromError(error);
  if (status >= 500 && status < 600) return true;
  if (status !== null) return false;

  const message = String(error?.message ?? error ?? "").toLowerCase();
  if (/failed to fetch|fetch failed|network error|network request failed|connection (?:reset|refused|lost)|socket hang up|econnreset|econnrefused|enotfound|enetunreach|etimedout|eai_again|service unavailable|bad gateway|gateway timeout/.test(message)) return true;
  return error?.name === "AbortError" || error?.name === "TimeoutError";
}

export function selectEndpoint(kind, endpoints, options = {}) {
  const pool = parseEndpoints(endpoints?.length ? endpoints : getEndpoints(kind, options));
  if (!pool.length) return null;
  const available = pool.filter((endpoint) => !isEndpointCoolingDown(kind, endpoint, options));
  if (available.length) return available[0];
  return pool.slice().sort((left, right) => {
    const leftAt = getEndpointState(kind, left)?.failedAt ?? Number.NEGATIVE_INFINITY;
    const rightAt = getEndpointState(kind, right)?.failedAt ?? Number.NEGATIVE_INFINITY;
    return leftAt - rightAt;
  })[0];
}

export async function withFailover(kind, fn, options = {}) {
  const pool = parseEndpoints(options.endpoints?.length ? options.endpoints : getEndpoints(kind, options));
  if (!pool.length) throw new Error(`No ${kind} endpoints configured`);

  const candidates = pool.filter((endpoint) => !isEndpointCoolingDown(kind, endpoint, options));
  const attempts = candidates.length ? candidates : pool.slice().sort((left, right) => {
    const leftAt = getEndpointState(kind, left)?.failedAt ?? Number.NEGATIVE_INFINITY;
    const rightAt = getEndpointState(kind, right)?.failedAt ?? Number.NEGATIVE_INFINITY;
    return leftAt - rightAt;
  });
  const timestamp = resolveClock(options)();

  for (let index = 0; index < attempts.length; index += 1) {
    const endpoint = attempts[index];
    try {
      return await fn(endpoint);
    } catch (error) {
      if (!isRetryableError(error)) throw error;
      markEndpointFailure(kind, endpoint, timestamp);
      if (index === attempts.length - 1) throw error;
    }
  }
  throw new Error(`No ${kind} endpoints configured`);
}
