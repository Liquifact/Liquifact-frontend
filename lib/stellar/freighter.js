export class UserRejectedError extends Error {
  constructor(message = "Request rejected in wallet") {
    super(message);
    this.name = "UserRejectedError";
  }
}

function rejected(err) {
  return /reject|denied|declined|cancel/i.test(String(err?.message ?? err ?? ""));
}

export async function connectWallet() {
  const api = await import("@stellar/freighter-api");
  const res = await api.requestAccess();
  if (res?.error) throw rejected(res.error) ? new UserRejectedError() : new Error(String(res.error.message || res.error));
  return res.address;
}

export async function signWithFreighter(xdr, networkPassphrase, address) {
  const api = await import("@stellar/freighter-api");
  const res = await api.signTransaction(xdr, { networkPassphrase, address });
  if (res?.error) throw rejected(res.error) ? new UserRejectedError() : new Error(String(res.error.message || res.error));
  return res.signedTxXdr;
}
