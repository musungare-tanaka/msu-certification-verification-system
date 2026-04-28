import type { AuthResponse, AuthUserProfile } from "./types";

const TOKEN_KEY = "msu_cert_token";
const PROFILE_KEY = "msu_cert_profile";

export function saveSession(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.accessToken);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(auth.user));
}

export function updateSessionProfile(patch: Partial<AuthUserProfile>) {
  if (typeof window === "undefined") return;
  const existing = getProfile();
  if (!existing) return;
  const updated = { ...existing, ...patch };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getProfile(): AuthUserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserProfile;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
