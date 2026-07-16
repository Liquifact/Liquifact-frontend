import React from "react";
import { render } from "@testing-library/react";
import { ToastProvider } from "../ToastProvider";
import { WalletProvider } from "../WalletProvider";
import WalletStatus from "../WalletStatus";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

test.skip("WalletStatus has no accessibility violations", async () => {
  const { container } = render(
    <ToastProvider>
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>
    </ToastProvider>
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
