import { render } from "@testing-library/react";
import { useWallet } from "./WalletContext";

function TestConsumer() {
  useWallet();
  return null;
}

describe("useWallet", () => {
  it("throws when used outside of a WalletProvider", () => {
    // React 18 catches render-phase errors and re-throws them as unhandled
    // exceptions. We suppress the expected console.error and verify the
    // error is thrown via the render call.
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useWallet must be used within a WalletProvider"
    );

    consoleSpy.mockRestore();
  });
});
