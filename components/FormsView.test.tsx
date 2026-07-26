import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import FormsView from "./FormsView";

expect.extend(toHaveNoViolations);

describe("FormsView a11y", () => {
  it("has no accessibility violations in loaded state", async () => {
    const { container } = render(
      <FormsView status="loaded" data={[{ title: "Form 1" }]} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in empty state", async () => {
    const { container } = render(<FormsView status="empty" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in error state", async () => {
    const { container } = render(
      <FormsView status="error" error={{ message: "Failed to load forms" }} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
