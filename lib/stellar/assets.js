import { Asset } from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

export const KNOWN_ASSETS = {
  testnet: {
    XLM: { code: "XLM", issuer: "native" },
    USDC: { code: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
  },
  mainnet: {
    XLM: { code: "XLM", issuer: "native" },
    USDC: { code: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" },
  },
};

export function sacContractId(asset, passphrase) {
  const a = asset.issuer === "native" ? Asset.native() : new Asset(asset.code, asset.issuer);
  return a.contractId(passphrase);
}
