import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import { copy } from "../app/copy/en";

describe("Footer Link Safety Tests", () => {
  const defaultExternalLinks = [
    { label: copy.footer.docs, href: copy.footer.docsUrl, external: true },
    { label: copy.footer.status, href: copy.footer.statusUrl, external: true },
    { label: copy.footer.contact, href: copy.footer.contactUrl, external: true },
    { label: copy.footer.discord, href: copy.footer.discordUrl, external: true },
  ];

  it("renders external links with proper rel and target attributes", () => {
    render(<Footer />);
    defaultExternalLinks.forEach((link) => {
      const anchor = screen.getByRole("link", { name: link.label });
      expect(anchor).toHaveAttribute("href", link.href);
      expect(anchor).toHaveAttribute("target", "_blank");
      expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("does not contain placeholder or unsafe hrefs", () => {
    render(<Footer />);
    const anchors = screen.getAllByRole("link");
    anchors.forEach((a) => {
      const href = a.getAttribute("href") || "";
      // No empty string, hash, or javascript: scheme
      expect(href).not.toBe("");
      expect(href).not.toBe("#");
      expect(href.startsWith("javascript:")).toBe(false);
    });
  });

  it("renders internal links using Next Link (client‑side navigation)", () => {
    const internalLinks = [{ label: "Home", href: "/", external: false }];
    render(<Footer links={internalLinks} />);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/");
    // Next Link mock renders a plain <a> without target/rel for internal links
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
