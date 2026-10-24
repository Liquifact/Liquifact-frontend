/**
 * Component tests for ContractCard.
 *
 * Uses Vitest + @testing-library/react + jsdom.
 * Run with: npm run test:ui
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ContractCard, { explorerContractUrl } from "@/components/ContractCard";

const TEST_CONTRACT_ID = "CDQCKR2YU6IVQ4GYPBMXBPZ4FGFQB5H25AI7ZSETHS2CZ5ZRCWQDSO6P";
const ALT_CONTRACT_ID = "CA3D5KRYMCMUZKMAQTCZZRM5RUMSSS6RIYRHQD2ELHSH4ENCQA6KZ7PW";

describe("ContractCard component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the passed contract ID and explorer link", () => {
    render(<ContractCard contractId={TEST_CONTRACT_ID} network="testnet" />);

    // Address is displayed in the contract box
    expect(screen.getByText(TEST_CONTRACT_ID)).toBeInTheDocument();

    // Explorer link points to stellar.expert with contractId
    const explorerLink = screen.getByRole("link", { name: /view on stellar\.expert/i });
    expect(explorerLink).toBeInTheDocument();
    expect(explorerLink).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/contract/${TEST_CONTRACT_ID}`
    );
    expect(explorerLink).toHaveAttribute("target", "_blank");
    expect(explorerLink).toHaveAttribute("rel", "noopener noreferrer");

    // Network badge / eyebrow is shown
    expect(screen.getByText(/soroban escrow · testnet/i)).toBeInTheDocument();
  });

  it("supports alternative contractId and custom network", () => {
    render(<ContractCard contractId={ALT_CONTRACT_ID} network="mainnet" />);

    expect(screen.getByText(ALT_CONTRACT_ID)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view on stellar\.expert/i });
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/mainnet/contract/${ALT_CONTRACT_ID}`
    );
    expect(screen.getByText(/soroban escrow · mainnet/i)).toBeInTheDocument();
  });

  it("returns null when contractId is not provided", () => {
    const { container } = render(<ContractCard contractId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exports explorerContractUrl helper that formats URL correctly", () => {
    expect(explorerContractUrl(TEST_CONTRACT_ID, "testnet")).toBe(
      `https://stellar.expert/explorer/testnet/contract/${TEST_CONTRACT_ID}`
    );
    expect(explorerContractUrl(ALT_CONTRACT_ID, "pubnet")).toBe(
      `https://stellar.expert/explorer/pubnet/contract/${ALT_CONTRACT_ID}`
    );
  });
});
