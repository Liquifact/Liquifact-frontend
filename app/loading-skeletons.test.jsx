import { render } from "@testing-library/react";
import { axe } from "jest-axe";

import InvoicesLoading from "./invoices/loading";
import InvestLoading from "./invest/loading";
import InvestDetailLoading from "./invest/[id]/loading";

/**
 * Regression coverage for the navigation loading skeleton (issue #641).
 *
 * Previously each route's loading.js hand-rolled its own inline nav
 * placeholder — invoices/loading.js included a wallet-button placeholder,
 * invest/loading.js and invest/[id]/loading.js did not — so the header
 * shrank/grew when the real NavMenu (links, network badge, wallet button,
 * hamburger) mounted, causing layout shift. All three now render the shared
 * NavMenuSkeleton, so their nav placeholder is identical.
 */
describe.each([
  ["InvoicesLoading", InvoicesLoading],
  ["InvestLoading", InvestLoading],
  ["InvestDetailLoading", InvestDetailLoading],
])("%s", (_name, LoadingComponent) => {
  it("renders exactly one header, sourced from the shared NavMenuSkeleton", () => {
    const { container } = render(<LoadingComponent />);
    const headers = container.querySelectorAll("header");
    expect(headers).toHaveLength(1);
    expect(headers[0]).toHaveAttribute("aria-hidden", "true");
    expect(headers[0]).toHaveAttribute("aria-busy", "true");
  });

  it("nav placeholder reserves space for the wallet button (no CLS on hydration)", () => {
    const { container } = render(<LoadingComponent />);
    expect(container.querySelector("header .h-12.w-80")).toBeTruthy();
  });

  it("keeps aria-busy on the page root", () => {
    const { container } = render(<LoadingComponent />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<LoadingComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
