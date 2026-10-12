import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sessions from "../../src/pages/Sessions";
import api from "../../src/services/api";
import { deferred, renderPage, response, session, signIn } from "../helpers";

describe("Session list", (): void => {
  beforeEach((): void => {
    signIn();
    vi.spyOn(console, "error").mockImplementation((): void => {});
  });

  it("loads the list with the token and hides admin controls", async (): Promise<void> => {
    const get = vi.spyOn(api, "get").mockResolvedValue(response([session]));
    renderPage(<Sessions />, "/sessions");
    expect(screen.getByText("Loading sessions...")).toBeInTheDocument();
    expect(await screen.findByText(session.name)).toBeInTheDocument();
    expect(screen.getByText("Participants: 0")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute(
      "href",
      "/sessions/1",
    );
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(
      "/session",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("handles an empty list", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response([]));
    renderPage(<Sessions />, "/sessions");
    expect(
      await screen.findByText("No sessions available"),
    ).toBeInTheDocument();
  });

  it("shows a loading error", async (): Promise<void> => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("Offline"));
    renderPage(<Sessions />, "/sessions");
    expect(
      await screen.findByText("Failed to load sessions"),
    ).toBeInTheDocument();
  });

  it("deletes an admin session and refreshes the list", async (): Promise<void> => {
    signIn(true);
    vi.spyOn(api, "get")
      .mockResolvedValueOnce(response([session]))
      .mockResolvedValue(response([]));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const remove = vi.spyOn(api, "delete").mockResolvedValue(response({}));
    renderPage(<Sessions />, "/sessions");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(
      await screen.findByText("No sessions available"),
    ).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith(
      "/session/1",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
      }),
    );
    expect(
      screen.getByRole("link", { name: "Create Session" }),
    ).toHaveAttribute("href", "/sessions/create");
  });

  it("preserves the session when deletion is cancelled", async (): Promise<void> => {
    signIn(true);
    vi.spyOn(api, "get").mockResolvedValue(response([session]));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const remove = vi.spyOn(api, "delete");
    renderPage(<Sessions />, "/sessions");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText(session.name)).toBeInTheDocument();
  });

  it("alerts when deletion fails", async (): Promise<void> => {
    signIn(true);
    vi.spyOn(api, "get").mockResolvedValue(response([session]));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(api, "delete").mockRejectedValue(new Error("Offline"));
    const alert = vi.spyOn(window, "alert").mockImplementation((): void => {});
    renderPage(<Sessions />, "/sessions");
    const button = await screen.findByRole("button", { name: "Delete" });
    await act(async (): Promise<void> => {
      fireEvent.click(button);
    });
    expect(alert).toHaveBeenCalledWith("Failed to delete session");
  });

  // A late response must not update a page that has already been removed.
  it.each(["resolve", "reject"] as const)(
    "aborts a pending request on unmount (%s)",
    async (outcome): Promise<void> => {
      const pending =
        deferred<ReturnType<typeof response<(typeof session)[]>>>();
      const get = vi.spyOn(api, "get").mockReturnValue(pending.promise);
      const view = renderPage(<Sessions />, "/sessions");
      const signal = get.mock.calls[0][1]?.signal;
      view.unmount();
      expect(signal?.aborted).toBe(true);
      await act(async (): Promise<void> => {
        if (outcome === "resolve") pending.resolve(response([session]));
        else pending.reject(new Error("Cancelled"));
      });
      expect(console.error).not.toHaveBeenCalled();
    },
  );
});
