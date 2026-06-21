import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import { copy } from "../app/copy/en";

describe("Footer", () => {
  it("renders real footer links from copy", () => {
    render(<Footer />);

    copy.footer.links.forEach((link) => {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href,
      );
    });
  });

  it("opens external links safely in a new tab", () => {
    render(<Footer />);

    copy.footer.links
      .filter((link) => link.external)
      .forEach((link) => {
        const anchor = screen.getByRole("link", { name: link.label });

        expect(anchor).toHaveAttribute("target", "_blank");
        expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
      });
  });

  it("includes the Discord community link", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", { name: copy.footer.discord }),
    ).toHaveAttribute("href", "https://discord.gg/JrGPH4V3");
  });
});
