const DEFAULT_API_URL = "https://liquifact-backend.vercel.app";
const DEFAULT_SITE_URL = "https://liquifact.app";
const DEFAULT_CONTRACT_ID =
  "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2ZZ5ZRCWQDSO6P";
const DEFAULT_NETWORK = "testnet";

const NETWORKS = {
  testnet: {
    id: "testnet",
    label: "Testnet",
    passphrase: "Test Stellar Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    explorerSlug: "testnet",
  },
  futurenet: {
    id: "futurenet",
    label: "Futurenet",
    passphrase: "Test Stellar Network ; September 2015",
    rpcUrl: "https://soroban-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    explorerSlug: "futurenet",
  },
  mainnet: {
    id: "mainnet",
    label: "Mainnet",
    passphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://soroban-mainnet.stellar.org",
    horizonUrl: "https://horizon.stellar.org",
    explorerSlug: "public",
  },
};

const NETWORK_ALIASES = {
  public: "mainnet",
  mainnet: "mainnet",
  testnet: "testnet",
  futurenet: "futurenet",
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of input) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return out;
}

function crc16xmod(data) {
  let crc = 0;
  for (const byte of data) {
    crc ^= (byte & 0xff) << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return crc & 0xffff;
}

function isValidContractStrkey(value) {
  if (typeof value !== "string" || value.length !== 56) return false;
  if (!value.startsWith("C")) return false;
  const decoded = base32Decode(value);
  if (!decoded || decoded.length !== 35) return false;
  const payload = decoded.slice(0, 33);
  const checksum = decoded[33] | (decoded[34] << 8);
  return crc16xmod(payload) === checksum;
}

export class ConfigError extends Error {
  constructor(problems) {
    const list = Array.isArray(problems) ? problems : [problems];
    super(`Invalid configuration:\n${list.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigError";
    this.problems = list;
  }
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function validateUrl(variable, rawValue, problems, { requireHttps = true } = {}) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    problems.push(`${variable} is required`);
    return null;
  }
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    problems.push(`${variable} must be a valid URL (received "${rawValue}")`);
    return null;
  }
  if (!parsed.protocol) {
    problems.push(`${variable} must be a valid URL (received "${rawValue}")`);
    return null;
  }
  if (requireHttps && parsed.protocol !== "https:") {
    if (!(parsed.protocol === "http:" && isLocalHost(parsed.hostname))) {
      problems.push(
        `${variable} must use https: (or http: for localhost) (received "${rawValue}")`,
      );
      return null;
    }
  }
  return parsed;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function parseConfig(env = {}) {
  const problems = [];

  const rawNetwork = (env.NEXT_PUBLIC_STELLAR_NETWORK || DEFAULT_NETWORK).trim().toLowerCase();
  const networkId = NETWORK_ALIASES[rawNetwork];
  if (!networkId) {
    problems.push(
      `NEXT_PUBLIC_STELLAR_NETWORK must be one of testnet, futurenet, mainnet (received "${env.NEXT_PUBLIC_STELLAR_NETWORK}")`,
    );
  }
  const networkBase = networkId ? NETWORKS[networkId] : null;

  const rawApiUrl = env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  const apiParsed = validateUrl("NEXT_PUBLIC_API_URL", rawApiUrl, problems);

  const rawSiteUrl = env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const siteParsed = validateUrl("NEXT_PUBLIC_SITE_URL", rawSiteUrl, problems);

  const rawContractId = env.NEXT_PUBLIC_CONTRACT_ID || DEFAULT_CONTRACT_ID;
  const contractId = typeof rawContractId === "string" ? rawContractId.trim() : "";
  if (!isValidContractStrkey(contractId)) {
    problems.push(
      `NEXT_PUBLIC_CONTRACT_ID must be a valid Contract strkey (starts with "C") (received "${rawContractId}")`,
    );
  }

  const rawRpcUrl = env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  const rpcParsed = rawRpcUrl
    ? validateUrl("NEXT_PUBLIC_SOROBAN_RPC_URL", rawRpcUrl, problems)
    : null;

  const rawHorizonUrl = env.NEXT_PUBLIC_HORIZON_URL;
  const horizonParsed = rawHorizonUrl
    ? validateUrl("NEXT_PUBLIC_HORIZON_URL", rawHorizonUrl, problems)
    : null;

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  const network = Object.freeze({
    id: networkBase.id,
    label: networkBase.label,
    passphrase: networkBase.passphrase,
    rpcUrl: trimTrailingSlash(rpcParsed ? rawRpcUrl : networkBase.rpcUrl),
    horizonUrl: trimTrailingSlash(horizonParsed ? rawHorizonUrl : networkBase.horizonUrl),
    explorerSlug: networkBase.explorerSlug,
  });

  return Object.freeze({
    apiUrl: trimTrailingSlash(apiParsed ? rawApiUrl : DEFAULT_API_URL),
    siteUrl: trimTrailingSlash(siteParsed ? rawSiteUrl : DEFAULT_SITE_URL),
    contractId,
    network,
  });
}

function safeParse() {
  try {
    return parseConfig(typeof process !== "undefined" && process.env ? process.env : {});
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError([error instanceof Error ? error.message : String(error)]);
  }
}

const config = safeParse();

export const API_URL = config.apiUrl;
export const SITE_URL = config.siteUrl;
export const CONTRACT_ID = config.contractId;
export const CONTRACT_INVOICE_ID = process.env.NEXT_PUBLIC_CONTRACT_INVOICE_ID || "INV_0001";
export const NETWORK = config.network.id;
export const NETWORK_LABEL = config.network.label;
export const NETWORK_PASSPHRASE = config.network.passphrase;
export const SOROBAN_RPC_URL = config.network.rpcUrl;
export const HORIZON_URL = config.network.horizonUrl;
export const NETWORK_CONFIG = config.network;

export function explorerContractUrl(id, network = config.network.explorerSlug) {
  return `https://stellar.expert/explorer/${network}/contract/${id}`;
}

export const EXPLORER_URL = explorerContractUrl(config.contractId, config.network.explorerSlug);
export const API_DOCS_URL = `${config.apiUrl}/docs`;
export const REPOS = Object.freeze({
  frontend: "https://github.com/Liquifact/Liquifact-frontend",
  backend: "https://github.com/Liquifact/Liquifact-backend",
  contracts: "https://github.com/Liquifact/Liquifact-contracts",
});
export default config;