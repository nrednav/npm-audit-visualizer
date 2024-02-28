import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders a title", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "npm-audit-visualizer" }),
    ).toBeVisible();
  });
});
