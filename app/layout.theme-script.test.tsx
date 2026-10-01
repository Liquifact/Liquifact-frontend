import React from "react";
import RootLayout from "./layout";
import { THEME_STORAGE_KEY } from "../components/ThemeToggle";

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

import { headers } from "next/headers";

const mockHeaders = headers as jest.Mock;

async function getThemeScript() {
  mockHeaders.mockResolvedValue({ get: () => null });
  const layout = await RootLayout({ children: null });
  const head = React.Children.toArray(layout.props.children)[0] as React.ReactElement<{
    children: React.ReactNode;
  }>;
  const script = React.Children.toArray(head.props.children)[0] as React.ReactElement<{
    dangerouslySetInnerHTML: { __html: string };
  }>;
  return script.props.dangerouslySetInnerHTML.__html;
}

describe("Root layout theme bootstrap", () => {
  let script: string;

  beforeAll(async () => {
    script = await getThemeScript();
  });

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn(() => ({ matches: false })),
    });
  });

  function runBootstrap() {
    new Function(script)();
    return document.documentElement.getAttribute("data-theme");
  }

  it("applies JSON-encoded and legacy preferences consistently on repeated runs", () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify("dark"));
    expect(runBootstrap()).toBe("dark");
    expect(runBootstrap()).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(runBootstrap()).toBe("light");
  });

  it("uses the system preference for auto, missing, malformed, and unsupported values", () => {
    window.matchMedia = jest.fn(() => ({ matches: true })) as typeof window.matchMedia;

    for (const storedValue of [
      null,
      "not-json",
      JSON.stringify("violet"),
      JSON.stringify("auto"),
    ]) {
      localStorage.clear();
      if (storedValue !== null) localStorage.setItem(THEME_STORAGE_KEY, storedValue);
      expect(runBootstrap()).toBe("light");
    }
  });

  it("keeps the document theme valid when the media query API throws", () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify("system"));
    window.matchMedia = jest.fn(() => {
      throw new Error("media query unavailable");
    }) as typeof window.matchMedia;

    expect(runBootstrap()).toBe("dark");
  });
});
