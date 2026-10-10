import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Navbar from "../../src/components/Navbar";
import type { AuthResponse } from "../../src/types";

// Group tests that check the navigation with the real authentication service.
describe("Navbar integration", (): void => {
  it("shows public links when logged out", (): void => {
    // Arrange: render the component with a router so its links can work.
    // tests/setup.ts clears localStorage and removes the DOM after each test.
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    // Assert: getByRole finds an expected element or fails the test.
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute(
      "href",
      "/login",
    );

    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );

    // queryByRole returns null when an element is absent, allowing absence checks.
    expect(
      screen.queryByRole("button", { name: "Logout" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: "Sessions" }),
    ).not.toBeInTheDocument();
  });

  it("clears the session and navigates on logout", async (): Promise<void> => {
    // Arrange: create a user interaction helper and a local signed-in session.
    // This token is only stored locally; this test sends no API request.
    const user = userEvent.setup();

    const account: AuthResponse = {
      id: 1,
      email: "user@example.test",
      firstName: "Test",
      lastName: "User",
      admin: false,
      token: "test-token",
    };

    localStorage.setItem("token", account.token);
    localStorage.setItem("user", JSON.stringify(account));

    // Start on /sessions and provide simple pages to observe the navigation.
    render(
      <MemoryRouter initialEntries={["/sessions"]}>
        <Navbar />
        <Routes>
          <Route path="/sessions" element={<h1>Sessions page</h1>} />
          <Route path="/login" element={<h1>Login page</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    // Act: wait for the click and the resulting React updates to finish.
    await user.click(screen.getByRole("button", { name: "Logout" }));

    // Assert: the real service clears storage and the router displays /login.
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();

    expect(
      screen.getByRole("heading", { name: "Login page" }),
    ).toBeInTheDocument();
  });
});
