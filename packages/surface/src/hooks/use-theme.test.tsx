import { fireEvent, render, screen } from "@testing-library/react";
import SiteHeader from "src/components/site-header";
import { THEME_STORAGE_KEY } from "src/hooks/theme-context";
import { ThemeProvider } from "src/hooks/use-theme";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const renderHeader = () =>
  render(
    <ThemeProvider>
      <SiteHeader />
    </ThemeProvider>,
  );

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    },
  });
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.theme;
  window.localStorage.clear();
});

describe("theme switch", () => {
  it("switches to dark mode and persists the preference", () => {
    renderHeader();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();
  });

  it("returns to light mode", () => {
    document.documentElement.dataset.theme = "dark";
    renderHeader();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("uses a stored preference before the first render", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderHeader();

    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();
  });
});
