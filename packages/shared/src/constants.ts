/**
 * Shared API configuration constants.
 * Used by both the web app and any package making HTTP calls.
 */
export const API_BASE_URL = "http://localhost:3001";

export const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};
