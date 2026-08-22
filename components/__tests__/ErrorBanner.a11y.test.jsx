import { render } from "@testing-library/react";
import ErrorBanner from "../ErrorBanner";
import { axe } from "jest-axe";

test("ErrorBanner has no accessibility violations", async () => {
  const { container } = render(
    <ErrorBanner
      variant="server"
      title="Error Title"
      description="Error description"
      actionLabel="Retry"
      onAction={() => {}}
    />
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
