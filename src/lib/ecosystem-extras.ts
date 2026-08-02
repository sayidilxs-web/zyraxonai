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

export async function uploadFileToRepo(
  repoOwner: string,
  repoName: string,
  filePath: string,
  fileContent: ArrayBuffer,
  message: string
): Promise<string | null> {
  const auth = getAuthState();
  if (!auth.token) return null;

  const contentBase64 = btoa(
    new Uint8Array(fileContent).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  let sha: string | undefined;
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      { headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/vnd.github.v3+json" } }
    );
    if (resp.ok) {
      const data = await resp.json();
      sha = data.sha;
    }
  } catch {}

  const body: Record<string, any> = { message, content: contentBase64 };
  if (sha) body.sha = sha;

  const resp = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (resp.ok) {
    return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`;
  }
  return null;
}

export async function createGitHubRelease(
  repoOwner: string,
  repoName: string,
  tagName: string,
  name: string,
  body: string
): Promise<{ id: number; uploadUrl: string } | null> {
  const auth = getAuthState();
  if (!auth.token) return null;

  const resp = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tag_name: tagName, name, body, draft: false, prerelease: false }),
  });

  if (resp.ok) {
    const data = await resp.json();
    return { id: data.id, uploadUrl: data.upload_url };
  }
  return null;
}

export async function uploadReleaseAsset(
  uploadUrl: string,
  fileName: string,
  fileContent: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  const auth = getAuthState();
  if (!auth.token) return null;

  const url = uploadUrl.replace("{?name,label}", `?name=${encodeURIComponent(fileName)}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": contentType,
      Accept: "application/vnd.github.v3+json",
    },
    body: fileContent,
  });

  if (resp.ok) {
    const data = await resp.json();
    return data.browser_download_url;
  }
  return null;
}

export async function uploadFileForItem(
  file: File,
  itemId: string,
  auth: { username: string; token: string }
): Promise<string | null> {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async () => {
      const ArrayBuffer = reader.result as ArrayBuffer;
      const filePath = `marketplace/assets/${itemId}/${file.name}`;
      const url = await uploadFileToRepo(
        auth.username,
        "zyraxon-ecosystem-data",
        filePath,
        ArrayBuffer,
        `Upload asset: ${file.name} for ${itemId}`
      );
      resolve(url);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function publishItem(
  item: EcosystemItem,
  files?: {
    coverImage?: File;
    screenshots?: File[];
    downloadFile?: File;
    logo?: File;
  }
): Promise<EcosystemItem> {
  const auth = getAuthState();
  if (!auth.isAuthenticated || !auth.user) throw new Error("Sign in before publishing");
  const storage = getGitHubStorage();
  if (!storage) throw new Error("GitHub storage is not initialized");

  const itemId = item.id || `${item.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let coverImageUrl = item.coverImage || "";
  let logoUrl = item.logo || "";
  let downloadUrl = item.downloadUrl || "";
  const screenshotUrls: string[] = item.screenshots || [];

  if (files?.coverImage) {
    const url = await uploadFileForItem(files.coverImage, itemId, {
      username: auth.user.username,
      token: auth.token!,
    });
    if (url) coverImageUrl = url;
  }

  if (files?.logo) {
    const url = await uploadFileForItem(files.logo, itemId, {
      username: auth.user.username,
      token: auth.token!,
    });
    if (url) logoUrl = url;
  }

  if (files?.downloadFile) {
    const ArrayBuffer = await files.downloadFile.arrayBuffer();
    const tagName = `${itemId}-v${item.version || "1.0.0"}`;
    const release = await createGitHubRelease(
      auth.user.username,
      "zyraxon-ecosystem-data",
      tagName,
      `${item.name} v${item.version || "1.0.0"}`,
      item.description
    );
    if (release) {
      const assetUrl = await uploadReleaseAsset(
        release.uploadUrl,
        files.downloadFile.name,
        ArrayBuffer,
        files.downloadFile.type || "application/octet-stream"
      );
      if (assetUrl) downloadUrl = assetUrl;
    }
  }

  if (files?.screenshots) {
    for (const ss of files.screenshots.slice(0, 5)) {
      const url = await uploadFileForItem(ss, `${itemId}-ss-${Date.now()}`, {
        username: auth.user.username,
        token: auth.token!,
      });
      if (url) screenshotUrls.push(url);
    }
  }

  const now = new Date().toISOString();
  const published: EcosystemItem = {
    ...item,
    id: itemId,
    authorId: auth.user.id,
    downloads: item.downloads || 0,
    rating: item.rating || 0,
    reviews: item.reviews || 0,
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    verified: item.verified || false,
    featured: item.featured || false,
    coverImage: coverImageUrl || undefined,
    logo: logoUrl || undefined,
    downloadUrl: downloadUrl || undefined,
    screenshots: screenshotUrls.length > 0 ? screenshotUrls : undefined,
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