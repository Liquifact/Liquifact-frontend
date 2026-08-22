import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import { copy } from "../app/copy/en";

describe("Footer", () => {
  it("renders documentation, system status, contact support, and discord links", () => {
    render(<Footer />);

    const docsLink = screen.getByRole("link", { name: copy.footer.docs });
    const statusLink = screen.getByRole("link", { name: copy.footer.status });
    const contactLink = screen.getByRole("link", { name: copy.footer.contact });
    const discordLink = screen.getByRole("link", { name: copy.footer.discord });

    expect(docsLink).toHaveAttribute("href", copy.footer.docsUrl);
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(statusLink).toHaveAttribute("href", copy.footer.statusUrl);
    expect(statusLink).toHaveAttribute("target", "_blank");
    expect(statusLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(contactLink).toHaveAttribute("href", copy.footer.contactUrl);
    expect(contactLink).toHaveAttribute("target", "_blank");
    expect(contactLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(discordLink).toHaveAttribute("href", copy.footer.discordUrl);
    expect(discordLink).toHaveAttribute("target", "_blank");
    expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders footer links in the expected order", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      copy.footer.docs,
      copy.footer.status,
      copy.footer.contact,
      copy.footer.discord,
    ]);
  });

  it("preserves accessible padding and hover styling on footer links", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);

    links.forEach((link) => {
      expect(link).toHaveClass("inline-block");
      expect(link).toHaveClass("py-3");
      expect(link).toHaveClass("hover:text-cyan-400");
    });
  });
});
