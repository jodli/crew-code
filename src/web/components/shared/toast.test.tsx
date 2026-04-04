import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast.tsx";

function ToastTrigger({ type, message }: { type: "success" | "error" | "info"; message: string }) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(type, message)}>
      trigger
    </button>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a success toast with the message text", async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="Saved!" />
      </ToastProvider>,
    );

    await act(async () => {
      screen.getByText("trigger").click();
    });
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("renders success toast with success styling", async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="ok" />
      </ToastProvider>,
    );

    await act(async () => {
      screen.getByText("trigger").click();
    });
    const toast = screen.getByText("ok");
    expect(toast.className).toContain("text-success");
  });

  it("renders error toast with error styling", async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="error" message="fail" />
      </ToastProvider>,
    );

    await act(async () => {
      screen.getByText("trigger").click();
    });
    const toast = screen.getByText("fail");
    expect(toast.className).toContain("text-error");
  });

  it("renders info toast with accent styling", async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="info" message="note" />
      </ToastProvider>,
    );

    await act(async () => {
      screen.getByText("trigger").click();
    });
    const toast = screen.getByText("note");
    expect(toast.className).toContain("text-accent");
  });

  it("auto-dismisses after 3500ms", async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" message="bye" />
      </ToastProvider>,
    );

    await act(async () => {
      screen.getByText("trigger").click();
    });
    expect(screen.getByText("bye")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText("bye")).not.toBeInTheDocument();
  });
});
