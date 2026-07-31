import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { SideBar } from "./components/side-bar";
import { getStoredAuth } from "./lib/auth.store";

/** Routes that don't require authentication */
const PUBLIC_PATHS = ["/login", "/register-account"];

export const rootRoute = createRootRoute({
  beforeLoad: ({ location }) => {
    const isPublic = PUBLIC_PATHS.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/")
    );

    const auth = getStoredAuth();

    if (!isPublic && !auth) {
      // Unauthenticated access to protected route → redirect to login
      throw redirect({ to: "/login" });
    }

    if (isPublic && auth) {
      // Already authenticated — skip auth pages and go to app
      throw redirect({ to: "/" });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  const auth = getStoredAuth();
  const isAuthenticated = auth !== null;

  if (!isAuthenticated) {
    // Public layout: full-screen, no sidebar
    return <Outlet />;
  }

  // Protected layout: sidebar + main content
  return (
    <div className="min-h-screen bg-neutral text-secondary font-sans grid grid-cols-[240px_1fr]">
      {/* SideBar Navigation */}
      <SideBar />

      {/* Main Outlet */}
      <main className="flex flex-col items-center justify-start p-6 w-full overflow-y-auto">
        <div className="w-full max-w-7xl flex flex-col items-center">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
