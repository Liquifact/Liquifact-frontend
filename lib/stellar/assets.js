// Asset registry per network. Testnet issuers:
// - USDC: Circle's testnet issuer, see https://developers.circle.com/stablecoins/usdc-on-test-networks
// - EURC: Circle's testnet issuer, same source.
// Mainnet issuers should be verified against the issuer's official docs before use.
export const ASSETS = {
  testnet: {
    XLM: { type: "native", code: "XLM", issuer: null },
    USDC: { type: "credit_alphanum4", code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
    EURC: { type: "credit_alphanum4", code: "EURC", issuer: "GB3Q6QDZYTHWT7E5PBS3W7FDD6ENXQ7MGLDGBKTBFR6JBGCMYBXNL4QK" },
  },
  public: {
    XLM: { type: "native", code: "XLM", issuer: null },
    USDC: { type: "credit_alphanum4", code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
    EURC: { type: "credit_alphanum4", code: "EURC", issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2" },
  },
};

/**
 * Resolve a currency code to an asset descriptor for the network.
 * @returns {{type: string, code: string, issuer: string|null} | "unsupported"}
 */
export function resolveAsset(code, network = "testnet") {
  const table = ASSETS[network] || ASSETS.testnet;
  return table[code] || "unsupported";
}

// --- Escrow funding-token verification (#1381) ---
import { Asset } from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  public: "Public Global Stellar Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

/** Known assets per network as `{ code, issuer | "native" }`, derived from ASSETS. */
export const KNOWN_ASSETS = Object.fromEntries(
  Object.entries(ASSETS).map(([net, table]) => [
    net,
    Object.fromEntries(Object.entries(table).map(([k, a]) => [k, { code: a.code, issuer: a.issuer ?? "native" }])),
  ])
);
KNOWN_ASSETS.mainnet = KNOWN_ASSETS.public;

/** Stellar Asset Contract id for a known asset on the given network passphrase. */
export function sacContractId(asset, passphrase) {
  const a = asset.issuer === "native" || !asset.issuer ? Asset.native() : new Asset(asset.code, asset.issuer);
  return a.contractId(passphrase);
}
