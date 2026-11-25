import { type ReactNode, useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme, ThemeContext } from "./theme-context";

const getInitialTheme = (): Theme => {
  const documentTheme = document.documentElement.dataset.theme;
  if (documentTheme === "dark" || documentTheme === "light") {
    return documentTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
};

export const ThemeProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    themeColor?.setAttribute(
      "content",
      theme === "dark" ? "#0f1512" : "#f4f5f0",
    );
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () =>
          setTheme((current) => {
            const nextTheme = current === "dark" ? "light" : "dark";
            try {
              window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
            } catch {
              // The visual theme still works when persistence is unavailable.
            }
            return nextTheme;
          }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
