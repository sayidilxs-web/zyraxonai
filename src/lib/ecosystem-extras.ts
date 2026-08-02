import type { EcosystemItem } from "./ecosystem-types";
import { getAuthState, loginWithToken } from "./ecosystem-auth";
import { getAllItems } from "./ecosystem-github";
import { getGitHubStorage } from "./ecosystem-github-data";

type DeviceFlowStart = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval?: number;
};

type DeviceFlowPoll = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function deviceFlowRequest(action: "start" | "poll", deviceCode?: string) {
  const response = await fetch("/api/public/github-device", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, device_code: deviceCode }),
  });
  const result = (await response.json()) as DeviceFlowStart & DeviceFlowPoll & { message?: string };
  if (!response.ok) throw new Error(result.message || result.error_description || "GitHub authentication failed");
  return result;
}

export async function startDeviceFlow(): Promise<DeviceFlowStart> {
  return deviceFlowRequest("start") as Promise<DeviceFlowStart>;
}

export async function pollDeviceCode(deviceCode: string): Promise<DeviceFlowPoll> {
  return deviceFlowRequest("poll", deviceCode) as Promise<DeviceFlowPoll>;
}

export async function completeDeviceFlowLogin(accessToken: string) {
  return loginWithToken(accessToken);
}

export async function handleGitHubCallback(code: string, state: string) {
  if (typeof window === "undefined") return { success: false, error: "Callback is only available in the browser" };
  const expectedState = sessionStorage.getItem("zyraxon_github_oauth_state");
  if (expectedState && state !== expectedState) return { success: false, error: "Invalid OAuth state" };

  try {
    const response = await fetch("/api/public/auth/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json()) as { token?: string; data?: { token?: string }; error?: { message?: string } };
    const token = body.token || body.data?.token;
    if (!response.ok || !token) return { success: false, error: body.error?.message || "Authentication failed" };
    const user = await loginWithToken(token);
    return user ? { success: true, user } : { success: false, error: "Could not load the GitHub user" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Authentication failed" };
  }
}

export function getAIConnection() {
  if (typeof window === "undefined") return null;
  return {
    connected: navigator.onLine,
    on(event: string, listener: (status: string) => void) {
      if (event !== "status") return undefined;
      const online = () => listener("connected");
      const offline = () => listener("off");
      window.addEventListener("online", online);
      window.addEventListener("offline", offline);
      return () => {
        window.removeEventListener("online", online);
        window.removeEventListener("offline", offline);
      };
    },
    trackEvent(event: string, payload: unknown) {
      window.dispatchEvent(new CustomEvent("zyraxon:ecosystem-event", { detail: { event, payload } }));
    },
  };
}

export async function publishItem(item: EcosystemItem): Promise<EcosystemItem> {
  const auth = getAuthState();
  if (!auth.isAuthenticated || !auth.user) throw new Error("Sign in before publishing");
  const storage = getGitHubStorage();
  if (!storage) throw new Error("GitHub storage is not initialized");

  const now = new Date().toISOString();
  const published: EcosystemItem = {
    ...item,
    id: item.id || crypto.randomUUID(),
    downloads: item.downloads || 0,
    rating: item.rating || 0,
    reviews: item.reviews || 0,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    verified: item.verified || false,
    featured: item.featured || false,
    createdAt: item.createdAt || now,
    updatedAt: now,
    repository: item.repository || item.githubRepo || "",
  };
  await storage.addPublishedItem(published);
  return published;
}

export async function getItemsByAuthor(authorId: string): Promise<EcosystemItem[]> {
  return (await getAllItems()).filter((item) => item.authorId === authorId);
}