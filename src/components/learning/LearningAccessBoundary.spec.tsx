// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LearningAccessBoundary from "./LearningAccessBoundary";

const authState = vi.hoisted(() => ({
  value: {
    authStatus: "anonymous",
    isAuthenticated: false,
    currentUser: null as { role: "user" } | null,
  },
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => authState.value,
}));

function renderBoundary() {
  const router = createMemoryRouter(
    [
      {
        path: "/learning",
        element: (
          <LearningAccessBoundary>
            <div>Protected learning</div>
          </LearningAccessBoundary>
        ),
      },
      { path: "/", element: <div>Login landing</div> },
    ],
    {
      initialEntries: ["/learning"],
      future: { v7_relativeSplatPath: true },
    },
  );
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
  return router;
}

describe("LearningAccessBoundary", () => {
  beforeEach(() => {
    authState.value = {
      authStatus: "anonymous",
      isAuthenticated: false,
      currentUser: null,
    };
  });

  it("redirects anonymous visitors to login", async () => {
    const router = renderBoundary();

    expect(await screen.findByText("Login landing")).toBeTruthy();
    expect(router.state.location.search).toBe("?auth=login");
  });

  it("renders Learning for an authenticated user account", () => {
    authState.value = {
      authStatus: "authenticated",
      isAuthenticated: true,
      currentUser: { role: "user" },
    };

    renderBoundary();

    expect(screen.getByText("Protected learning")).toBeTruthy();
  });
});
