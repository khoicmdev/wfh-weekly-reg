import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SideBar } from "./components/side-bar";

export const rootRoute = createRootRoute({
  component: () => (
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
  ),
});

