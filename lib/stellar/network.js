import { NETWORK } from "../config.js";

// Passphrases are plain string constants so this module stays dependency-free
// and importable from plain node --test ESM.
export const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  public: "Public Global Stellar Network ; September 2015",
};

export const RPC_URLS = {
  testnet: "https://soroban-testnet.stellar.org",
  public: "https://soroban-rpc.mainnet.stellar.gateway.fm",
};

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_RPC_PASSPHRASE || NETWORK_PASSPHRASES[NETWORK] || NETWORK_PASSPHRASES.testnet;

export const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || RPC_URLS[NETWORK] || RPC_URLS.testnet;

// Any valid StrKey works as the source of a read-only simulation; the account
// does not need to exist on-chain. Using a constant keeps simulations
// deterministic. This is the admin address already used in demo data.
export const SIMULATION_SOURCE = "GA7TXEBMEPQCLHIYCWDN7RKAO5IMRD2UV7O7TZXMEW6VZUMEXNR4XBB5";
