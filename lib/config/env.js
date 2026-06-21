const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_STELLAR_NETWORK = "testnet";
const ALLOWED_STELLAR_NETWORKS = new Set(["testnet", "public", "futurenet"]);

function readOptionalEnv(env, key) {
  return Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined;
}

function validateOrigin(value, key) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} must be a non-empty http(s) origin.`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL origin.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${key} must use the http or https scheme.`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`${key} must be an origin only, for example https://api.example.com.`);
  }

  return parsed.origin;
}

function validateStellarNetwork(value) {
  if (value === undefined) {
    return DEFAULT_STELLAR_NETWORK;
  }

  if (!ALLOWED_STELLAR_NETWORKS.has(value)) {
    throw new Error(
      `NEXT_PUBLIC_STELLAR_NETWORK must be one of: ${Array.from(ALLOWED_STELLAR_NETWORKS).join(", ")}.`,
    );
  }

  return value;
}

export function createPublicEnvConfig(env = process.env) {
  const configuredApiUrl = readOptionalEnv(env, "NEXT_PUBLIC_API_URL");
  const apiUrl = validateOrigin(
    configuredApiUrl === undefined ? DEFAULT_API_URL : configuredApiUrl,
    "NEXT_PUBLIC_API_URL",
  );

  return Object.freeze({
    apiUrl,
    stellarNetwork: validateStellarNetwork(
      readOptionalEnv(env, "NEXT_PUBLIC_STELLAR_NETWORK"),
    ),
  });
}

/**
 * Public browser-safe environment config. Import this instead of reading
 * process.env directly from React components.
 */
export const publicEnv = createPublicEnvConfig();
