import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK } from "../config.js";
import { getNetwork } from "./networks.js";
import { signTransaction } from "./freighter.js";

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 90_000;

function networkConfig(network = NETWORK) {
  const config = getNetwork(network);
  const networkPassphrase = network === "mainnet" || network === "pubnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
  return { ...config, networkPassphrase };
}

function createServer(network) {
  return new SorobanRpc.Server(network.sorobanRpcUrl, { allowHttp: false });
}

function resultValue(simulation) {
  if (simulation.error) throw new Error(simulation.error);
  const result = simulation.results?.[0];
  if (!result) throw new Error("Soroban simulation returned no contract result.");
  return scValToNative(result.retval);
}

async function buildCall({ contractId, source, method, network, args = [] }) {
  const account = await network.server.getAccount(source);
  const transaction = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  return transaction;
}

export async function simulateContractCall({
  contractId = CONTRACT_ID,
  source,
  method,
  networkName = NETWORK,
}) {
  if (!source) throw new Error("A connected Stellar account is required to simulate this call.");
  const config = networkConfig(networkName);
  config.server = createServer(config);
  const transaction = await buildCall({
    contractId,
    source,
    method,
    network: config,
  });
  const simulation = await config.server.simulateTransaction(transaction);
  return resultValue(simulation);
}

export async function readSmeEscrow({
  contractId = CONTRACT_ID,
  source,
  networkName = NETWORK,
}) {
  const [escrow, readiness, protocolFeeBps] = await Promise.all([
    simulateContractCall({ contractId, source, networkName, method: "get_escrow" }),
    simulateContractCall({
      contractId,
      source,
      networkName,
      method: "get_settlement_readiness",
    }),
    simulateContractCall({
      contractId,
      source,
      networkName,
      method: "get_protocol_fee_bps",
    }),
  ]);
  return { escrow, readiness, protocolFeeBps: Number(protocolFeeBps) };
}

export async function submitSmeAction({
  contractId = CONTRACT_ID,
  source,
  method,
  networkName = NETWORK,
}) {
  if (!source) throw new Error("A connected Stellar account is required to submit this action.");
  const config = networkConfig(networkName);
  config.server = createServer(config);
  const transaction = await buildCall({
    contractId,
    source,
    method,
    network: config,
  });
  const simulation = await config.server.simulateTransaction(transaction);
  if (simulation.error) throw new Error(simulation.error);

  const prepared = SorobanRpc.assembleTransaction(transaction, simulation).build();
  const signedXdr = await signTransaction(prepared.toXDR(), config.networkPassphrase);
  const signed = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const submitted = await config.server.sendTransaction(signed);
  if (submitted.status === "ERROR") {
    throw new Error(submitted.errorResult?.toXDR?.() || "Soroban rejected the transaction.");
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await config.server.getTransaction(submitted.hash);
    if (result.status === "SUCCESS") return { hash: submitted.hash };
    if (result.status === "FAILED") {
      throw new Error(result.resultXdr || "The Soroban transaction failed.");
    }
  }
  throw new Error(`Transaction ${submitted.hash} is still pending. Check the Stellar explorer.`);
}
