import { fundedPercent } from "@/lib/format";

export default function FundingProgress({ funded, target, currency, size = "md", showLabel = false }) {
  const fundedAmount = Number.isFinite(Number(funded)) ? Number(funded) : 0;
  const targetAmount = Number.isFinite(Number(target)) ? Number(target) : 0;
  const percent = fundedPercent({ amount: targetAmount, fundedAmount });
  const formattedFunded = fundedAmount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const formattedTarget = targetAmount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const valueText = `${percent}% funded, ${formattedFunded} of ${formattedTarget} ${currency}`;

  return (
    <div className={`funding-progress funding-progress-${size}`}>
      {showLabel && <span className="funding-progress-label">{valueText}</span>}
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}