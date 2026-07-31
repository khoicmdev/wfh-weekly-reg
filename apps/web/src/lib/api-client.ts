import { getStoredAuth, clearStoredAuth } from "./auth.store";
import { router } from "../routes/router-config";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const auth = getStoredAuth();
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (auth?.token) {
    headers["Authorization"] = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearStoredAuth();
    // Navigate to login, replacing history so user can't go back
    await router.navigate({ to: "/login", replace: true });
    throw new Error("Session expired. Please sign in again.");
  }

  const data = await response.json() as T & { error?: string };

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "An unexpected error occurred.");
  }

  return data;
}
