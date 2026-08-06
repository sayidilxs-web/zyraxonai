import type { User } from "./ecosystem-types";

const GITHUB_CLIENT_ID = "Ov23li80YUa3q7YPon5m";
const STORAGE_KEY = "zyraxon_ecosystem_auth";

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export function getAuthState(): AuthState {
  if (typeof window === "undefined") return { user: null, token: null, isAuthenticated: false };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { user: parsed.user, token: parsed.token, isAuthenticated: !!parsed.user && !!parsed.token };
    }
  } catch {}
  return { user: null, token: null, isAuthenticated: false };
}

export function setAuthState(state: Partial<AuthState>): void {
  const current = getAuthState();
  const next = { ...current, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: next.user, token: next.token }));
}

export function clearAuthState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function loginWithToken(token: string): Promise<User | null> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) throw new Error("Invalid token");
    const githubUser = await response.json();
    const user: User = {
      id: `user-${githubUser.id}`,
      githubUserId: githubUser.id,
      username: githubUser.login,
      displayName: githubUser.name || githubUser.login,
      email: githubUser.email || "",
      avatarUrl: githubUser.avatar_url,
      bio: githubUser.bio || "",
      title: "",
      skills: [],
      location: githubUser.location || "",
      company: githubUser.company || "",
      blog: githubUser.blog || "",
      followerCount: githubUser.followers || 0,
      followingCount: githubUser.following || 0,
      publishedCount: 0,
      createdAt: githubUser.created_at || new Date().toISOString(),
    };
    setAuthState({ user, token });
    return user;
  } catch {
    return null;
  }
}

export function logout(): void {
  clearAuthState();
}
