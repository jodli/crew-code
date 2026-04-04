import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../app.tsx";
import { renderApp } from "./render.tsx";

describe("App", () => {
  it("renders navigation with Blueprints and Crews links", () => {
    renderApp(<App />);
    expect(screen.getByRole("link", { name: "Blueprints" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crews" })).toBeInTheDocument();
  });

  it("renders the crew branding in the nav", () => {
    renderApp(<App />);
    expect(screen.getByText("crew")).toBeInTheDocument();
  });

  it("theme toggle button is clickable without crashing", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    const themeButton = screen.getByTitle(/Theme:/);
    await user.click(themeButton);
    expect(themeButton).toBeInTheDocument();
  });

  it("renders blueprints page at / route", () => {
    renderApp(<App />, { route: "/" });
    expect(screen.getByRole("heading", { name: "Blueprints" })).toBeInTheDocument();
  });

  it("renders crews page at /crews route", () => {
    renderApp(<App />, { route: "/crews" });
    expect(screen.getByRole("heading", { name: "Crews" })).toBeInTheDocument();
  });
});
