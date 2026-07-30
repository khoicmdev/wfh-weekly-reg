import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "../app";
import { indexRoute } from "./children/index-route";

// rootRoute only has feature parent routes as top-level children
const routeTree = rootRoute.addChildren([
  indexRoute,
]);

// Create and export router instance
export const router = createRouter({ routeTree });

// Register router for TypeScript type safety across TanStack hooks
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
