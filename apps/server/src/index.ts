import { onRequest } from "firebase-functions/v2/https";
import { app } from "./server.js";

export const api = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
    invoker: "public",
  },
  app
);
