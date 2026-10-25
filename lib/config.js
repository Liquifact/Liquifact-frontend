export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://liquifact-backend.vercel.app").replace(/\/$/, "");
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID || "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
export const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
export const EXPLORER_URL = `https://stellar.expert/explorer/${NETWORK}/contract/${CONTRACT_ID}`;
export const API_DOCS_URL = `${API_URL}/docs`;
export const REPOS = {
  frontend: "https://github.com/Liquifact/Liquifact-frontend",
  backend: "https://github.com/Liquifact/Liquifact-backend",
  contracts: "https://github.com/Liquifact/Liquifact-contracts",
};
