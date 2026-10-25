const STATUS_FUNDED = 1;
const BPS_DENOMINATOR = 10_000n;

function value(object, ...keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
}

function isTrueFlag(flag) {
  return flag === true || flag === 1 || flag === 1n;
}

export function deriveSmeActions({ escrow, readiness, connected }) {
  const smeAddress = value(escrow, "sme_address", "smeAddress");
  const isSme = Boolean(
    connected && smeAddress && connected === smeAddress,
  );
  const status = value(escrow, "status");
  const withdrawEnabled = isSme && Number(status) === STATUS_FUNDED;

  const fundedFlag = value(readiness, "funded", "is_funded");
  const maturityFlag = value(readiness, "maturity_reached", "maturityReached");
  const noLegalHoldFlag = value(
    readiness,
    "no_legal_hold",
    "noLegalHold",
  );
  const legalHoldFlag = value(readiness, "legal_hold", "legal_hold_active");
  const funded = fundedFlag === undefined
    ? Number(status) === STATUS_FUNDED
    : isTrueFlag(fundedFlag);
  const maturityReached = maturityFlag !== undefined && isTrueFlag(maturityFlag);
  const noLegalHold = noLegalHoldFlag !== undefined
    ? isTrueFlag(noLegalHoldFlag)
    : legalHoldFlag !== undefined
      ? !isTrueFlag(legalHoldFlag)
      : false;
  const readyNow = value(readiness, "ready_now", "readyNow");
  const settleChecks = [
    [funded, "Invoice is not funded."],
    [maturityReached, "Maturity has not been reached."],
    [noLegalHold, "A legal hold is active."],
  ];
  const settleReasons = settleChecks
    .filter(([passed]) => !passed)
    .map(([, reason]) => reason);
  const settleEnabled = isSme && isTrueFlag(readyNow) && settleReasons.length === 0;

  return {
    isSme,
    withdraw: {
      enabled: withdrawEnabled,
      reason: withdrawEnabled
        ? null
        : Number(status) === STATUS_FUNDED
          ? "Only the SME wallet can withdraw liquidity."
          : "Liquidity can be withdrawn only after the invoice is funded.",
    },
    settle: {
      enabled: settleEnabled,
      reason: settleEnabled
        ? null
        : !isSme
          ? "Only the SME wallet can settle this invoice."
          : settleReasons.length
            ? settleReasons.join(" ")
            : "Settlement readiness is unavailable.",
    },
  };
}

export function calculateNetWithdrawal(fundedAmount, feeBps) {
  const amount = BigInt(fundedAmount);
  const fee = BigInt(feeBps);
  if (amount < 0n) throw new RangeError("Funded amount cannot be negative.");
  if (fee < 0n || fee > BPS_DENOMINATOR) {
    throw new RangeError("Protocol fee must be between 0 and 10000 bps.");
  }
  return (amount * (BPS_DENOMINATOR - fee)) / BPS_DENOMINATOR;
}
