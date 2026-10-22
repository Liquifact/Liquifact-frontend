import {
  Address,
  Networks,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";

const STROOPS_PER_UNIT = 10_000_000n;

function formatStroops(stroops) {
  const value = BigInt(stroops);
  const whole = value / STROOPS_PER_UNIT;
  const fraction = value % STROOPS_PER_UNIT;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(7, "0").replace(/0+$/, "")}`;
}

function describeNetwork(passphrase) {
  if (passphrase === Networks.TESTNET) return "testnet";
  if (passphrase === Networks.PUBLIC) return "public";
  return "custom";
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function describeOperation(operation) {
  if (operation.type === "invokeHostFunction" && operation.func) {
    const kind = operation.func.switch().name;

    if (kind === "hostFunctionTypeInvokeContract") {
      const invocation = operation.func.invokeContract();
      return {
        type: "invokeContract",
        contractId: Address.fromScAddress(invocation.contractAddress()).toString(),
        fn: invocation.functionName().toString(),
        args: invocation.args().map((arg) => scValToNative(arg)),
      };
    }

    if (
      kind === "hostFunctionTypeCreateContract" ||
      kind === "hostFunctionTypeCreateContractV2"
    ) {
      const create =
        kind === "hostFunctionTypeCreateContractV2"
          ? operation.func.createContractV2()
          : operation.func.createContract();
      const executable = create.executable();
      return {
        type: "createContract",
        wasmHash:
          executable.switch().name === "contractExecutableWasm"
            ? hex(new Uint8Array(executable.wasmHash()))
            : null,
      };
    }

    return { type: "invokeHostFunction", hostFunction: kind };
  }

  if (operation.type === "changeTrust" && operation.line) {
    return {
      type: "changeTrust",
      asset: `${operation.line.getCode()}:${operation.line.getIssuer()}`,
      limit: String(operation.limit),
    };
  }

  return {
    type: operation.type,
    ...(operation.source ? { source: operation.source } : {}),
  };
}

export function describeTx(xdr, networkPassphrase) {
  let transaction;
  try {
    transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  } catch (err) {
    throw new Error(`Invalid transaction XDR: ${err.message || err}`);
  }

  if ("innerTransaction" in transaction) {
    transaction = transaction.innerTransaction;
  }

  return {
    source: transaction.source,
    fee: formatStroops(transaction.fee),
    sequence: String(transaction.sequence),
    timeBounds: transaction.timeBounds
      ? {
          minTime: String(transaction.timeBounds.minTime),
          maxTime: String(transaction.timeBounds.maxTime),
        }
      : null,
    operations: transaction.operations.map(describeOperation),
    network: describeNetwork(networkPassphrase),
  };
}
