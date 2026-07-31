const AUTH_STORAGE_KEY = "wfh_auth_state";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
}

export interface AuthState {
  token: string;
  user: AuthUser;
}

export function getStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setStoredAuth(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
