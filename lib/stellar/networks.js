/**
 * Stellar network configuration.
 *
 * Horizon endpoint and Friendbot URL are only defined for testnet because
 * Friendbot does not exist on mainnet / pubnet.
 */

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

export const NETWORKS = {
  testnet: {
    name: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
    passphrase: TESTNET_PASSPHRASE,
  },
  mainnet: {
    name: "mainnet",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null, // not available on mainnet
    passphrase: PUBLIC_PASSPHRASE,
  },
  pubnet: {
    name: "pubnet",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null,
    passphrase: PUBLIC_PASSPHRASE,
  },
};

/**
 * Network passphrases mapping for backward compatibility and cross-module consumers.
 * Derived from NETWORKS with 'public' aliasing 'mainnet'.
 */
export const NETWORK_PASSPHRASES = {
  ...Object.fromEntries(Object.entries(NETWORKS).map(([k, v]) => [k, v.passphrase])),
  public: NETWORKS.mainnet.passphrase,
};

/**
 * Return the network config for `name`, falling back to testnet.
 * @param {string} name
 * @returns {{ name: string, horizonUrl: string, friendbotUrl: string|null, passphrase: string }}
 */
export function getNetwork(name) {
  return NETWORKS[name] ?? NETWORKS.testnet;
}

/** The network name configured at build time (used as default). */
export const CONFIGURED_NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
