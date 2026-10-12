import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "../../src/pages/Profile";
import api from "../../src/services/api";
import { deferred, profile, renderPage, response, signIn } from "../helpers";

describe("Profile and account actions", (): void => {
  beforeEach((): void => {
    signIn();
    vi.stubEnv("DEV", true);
    vi.spyOn(console, "error").mockImplementation((): void => {});
  });
  const show = () => renderPage(<Profile />, "/profile");

  it("loads the user and displays profile information", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    show();
    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
    expect(await screen.findByText(profile.email)).toBeInTheDocument();
    expect(screen.getAllByText("User")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Promote to Admin (Dev)" }),
    ).toBeInTheDocument();
  });

  it("hides development promotion outside development", async (): Promise<void> => {
    vi.stubEnv("DEV", false);
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    show();
    await screen.findByText(profile.email);
    expect(
      screen.queryByText("Promote to Admin (Dev)"),
    ).not.toBeInTheDocument();
  });

  it("promotes and updates the stored role", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    vi.spyOn(api, "post").mockResolvedValue(
      response({ ...profile, admin: true }),
    );
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Promote to Admin (Dev)" }),
    );
    expect(await screen.findByText("Administrator")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("user")!).admin).toBe(true);
  });

  it("shows a promotion error", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    vi.spyOn(api, "post").mockRejectedValue(new Error("Forbidden"));
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Promote to Admin (Dev)" }),
    );
    expect(
      await screen.findByText("Failed to promote to admin"),
    ).toBeInTheDocument();
  });

  it("disables promotion during the request", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    const pending = deferred<ReturnType<typeof response<typeof profile>>>();
    vi.spyOn(api, "post").mockReturnValue(pending.promise);
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Promote to Admin (Dev)" }),
    );
    expect(screen.getByRole("button", { name: "Promoting..." })).toBeDisabled();
    await act(async (): Promise<void> => {
      pending.resolve(response({ ...profile, admin: true }));
    });
  });

  it("deletes the account, clears storage and redirects", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    const remove = vi.spyOn(api, "delete").mockResolvedValue(response({}));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Account" }),
    );
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
    expect(remove).toHaveBeenCalledWith("/user/1", expect.anything());
  });

  it("does not delete after cancelling", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    const remove = vi.spyOn(api, "delete");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Account" }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("alerts when account deletion fails", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    vi.spyOn(api, "delete").mockRejectedValue(new Error("Offline"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alert = vi.spyOn(window, "alert").mockImplementation((): void => {});
    show();
    const button = await screen.findByRole("button", {
      name: "Delete Account",
    });
    await act(async (): Promise<void> => {
      fireEvent.click(button);
    });
    expect(alert).toHaveBeenCalledWith("Failed to delete account");
    expect(localStorage.getItem("token")).not.toBeNull();
  });

  it("returns to the session list", async (): Promise<void> => {
    vi.spyOn(api, "get").mockResolvedValue(response(profile));
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Back to Sessions" }),
    );
    expect(await screen.findByText("Sessions destination")).toBeInTheDocument();
  });

  it.each([null, new Error("Offline")])(
    "handles a missing or failed profile response",
    async (result): Promise<void> => {
      const get = vi.spyOn(api, "get");
      if (result instanceof Error) get.mockRejectedValue(result);
      else get.mockResolvedValue(response(result));
      show();
      expect(
        await screen.findByText(
          result instanceof Error
            ? "Failed to load user information"
            : "Failed to load profile",
        ),
      ).toBeInTheDocument();
    },
  );

  it("redirects when the saved user is absent", async (): Promise<void> => {
    localStorage.removeItem("user");
    const get = vi.spyOn(api, "get");
    show();
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)(
    "ignores a pending request after unmount (%s)",
    async (outcome): Promise<void> => {
      const pending = deferred<ReturnType<typeof response<typeof profile>>>();
      const get = vi.spyOn(api, "get").mockReturnValue(pending.promise);
      const view = show();
      const signal = get.mock.calls[0][1]?.signal;
      view.unmount();
      expect(signal?.aborted).toBe(true);
      await act(async (): Promise<void> => {
        if (outcome === "resolve") pending.resolve(response(profile));
        else pending.reject(new Error("Cancelled"));
      });
      expect(console.error).not.toHaveBeenCalled();
    },
  );
});
