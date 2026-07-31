import { useSyncExternalStore } from "react";

const AUTH_STORAGE_KEY = "wfh_auth_state";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  registerPreference?: "monthly" | "biweekly" | "weekly";
}

export interface AuthState {
  token: string;
  user: AuthUser;
}

function readFromStorage(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

// In-memory cache synced with localStorage
let currentAuth: AuthState | null = readFromStorage();

// Subscribers listening for auth changes
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Synchronous getter for current auth state */
export function getStoredAuth(): AuthState | null {
  return currentAuth;
}

/** Update auth state in localStorage and notify all React listeners */
export function setStoredAuth(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  currentAuth = state;
  notify();
}

/** Clear auth state from localStorage and notify all React listeners */
export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  currentAuth = null;
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Custom hook backed by React's useSyncExternalStore for instant reactive updates */
export function useAuth(): AuthState | null {
  return useSyncExternalStore(
    subscribe,
    getStoredAuth,
    () => null // Server snapshot fallback
  );
}
