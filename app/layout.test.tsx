import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import RootLayout from "./layout";

jest.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

jest.mock("../components/ToastProvider", () => ({
  ToastProvider: ({ children }) => <>{children}</>,
}));

jest.mock("../components/Footer", () => {
  function MockFooter() {
    return (
      <footer>
        <a href="/docs">Docs</a>
      </footer>
    );
  }

  return {
    __esModule: true,
    default: MockFooter,
  };
});

function renderLayout() {
  return render(
    <RootLayout>
      <main id="main-content" tabIndex={-1}>
        Main content
      </main>
    </RootLayout>,
  );
}

describe("RootLayout accessibility", () => {
  it("renders a skip link that targets the main content landmark", () => {
    renderLayout();

    const skipLink = screen.getByRole("link", { name: /skip to content/i });

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByText("Main content")).toHaveAttribute(
      "id",
      "main-content",
    );
  });

  it("places the skip link before other focusable elements", () => {
    const { container } = renderLayout();
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    expect(focusable[0]).toHaveTextContent(/skip to content/i);
  });

  it("has no automated accessibility violations", async () => {
    const { container } = renderLayout();

    await expect(axe(container)).resolves.toHaveNoViolations();
  });
});
