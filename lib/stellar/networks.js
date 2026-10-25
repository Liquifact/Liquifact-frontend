/**
 * Stellar network configuration.
 *
 * Horizon endpoint and Friendbot URL are only defined for testnet because
 * Friendbot does not exist on mainnet / pubnet.
 */

export const NETWORKS = {
  testnet: {
    name: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
  },
  mainnet: {
    name: "mainnet",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null, // not available on mainnet
    passphrase: "Public Global Stellar Network ; September 2015",
  },
  pubnet: {
    name: "pubnet",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null,
    passphrase: "Public Global Stellar Network ; September 2015",
  },
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
