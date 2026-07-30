import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../../app";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // beforeLoad: () => {
  //   throw redirect({ to: "/users" });
  // },
});

