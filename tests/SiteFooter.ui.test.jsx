import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => "en",
}));

import SiteFooter from "../components/SiteFooter.jsx";
import { I18nProvider } from "../lib/i18n/I18nProvider.jsx";
import { getDictionary, LOCALE_COOKIE } from "../lib/i18n/index.js";
import { API_DOCS_URL, API_URL, EXPLORER_URL, REPOS } from "../lib/config.js";

async function renderFooter() {
  const footer = await SiteFooter();
  return render(
    <I18nProvider locale="en" dict={getDictionary("en")}>
      {footer}
    </I18nProvider>,
  );
}

beforeEach(() => {
  document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  refreshMock.mockClear();
});
afterEach(cleanup);

describe("SiteFooter", () => {
  it("uses configured destinations and secures external links", async () => {
    await renderFooter();

    const destinations = [
      ["API docs", API_DOCS_URL],
      ["API status", `${API_URL}/health`],
      ["Escrow contract", EXPLORER_URL],
      ["Frontend", REPOS.frontend],
      ["Backend", REPOS.backend],
      ["Contracts", REPOS.contracts],
    ];

    for (const [label, href] of destinations) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("sets the Spanish locale cookie, announces the change, and refreshes the router", async () => {
    const user = userEvent.setup();
    await renderFooter();

    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "es");

    expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
    expect(screen.getByRole("status")).toHaveTextContent("Idioma cambiado a Español");
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
