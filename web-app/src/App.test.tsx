import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders", () => {
    render(<App />);
    expect(screen.getByText(/app/i)).toBeVisible();
  });
});
