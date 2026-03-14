import {
  SITE_CONTENT_STORAGE_KEY
} from "./auth.js";
import { fetchSupabasePublishedSiteContent, getSupabasePublicConfig } from "./supabase.js";
import type {
  GitHubContentWriteResponse,
  GitHubRateHeaders,
  GitHubRepositoryEntry,
  PortalImageLibraryEntry,
  SiteContent
} from "../../../assets/js/types/core";

export const SITE_CONTENT_SOURCE = "data/site-content.json";
export const PORTAL_IMAGE_DIRECTORIES = ["assets/images/portal", "assets/images"] as const;
export const PORTAL_IMAGE_UPLOAD_DIR = "assets/images/portal";
export const GITHUB_REPO_CONFIG = {
  owner: "GustavoRodriguesAlves",
  repo: "Ceeja-Paulo-Decourt",
  branch: "main",
  path: SITE_CONTENT_SOURCE
} as const;

const GITHUB_TOKEN_STORAGE_KEY = "ceeja_github_publish_token";
const IMAGE_EXTENSION_PATTERN = /\.(jpg|jpeg|png|webp)$/i;

class GitHubApiError extends Error {
  status: number;
  headers: GitHubRateHeaders;

  constructor(message: string, status: number, headers: GitHubRateHeaders = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.headers = headers;
  }
}

export function normalizeSiteContent(raw?: Partial<SiteContent> | null): SiteContent {
  const safeRaw = raw || {};

  return {
    updatedAt:
      typeof safeRaw.updatedAt === "string"
        ? safeRaw.updatedAt
        : new Date().toISOString(),
    notices: Array.isArray(safeRaw.notices) ? safeRaw.notices : [],
    quickLinks: Array.isArray(safeRaw.quickLinks) ? safeRaw.quickLinks : [],
    gallery: Array.isArray(safeRaw.gallery) ? safeRaw.gallery : []
  };
}

export function readDraftSiteContent(): SiteContent | null {
  const draft = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
  if (!draft) {
    return null;
  }

  try {
    return normalizeSiteContent(JSON.parse(draft) as Partial<SiteContent>);
  } catch (error) {
    console.warn("Falha ao ler conteúdo local salvo.", error);
    return null;
  }
}

export function saveDraftSiteContent(content: Partial<SiteContent> | SiteContent): void {
  localStorage.setItem(
    SITE_CONTENT_STORAGE_KEY,
    JSON.stringify(normalizeSiteContent(content))
  );
}

export function clearDraftSiteContent(): void {
  localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
}

export async function fetchPublishedSiteContentFromJson(): Promise<SiteContent> {
  const response = await fetch(SITE_CONTENT_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return normalizeSiteContent((await response.json()) as Partial<SiteContent>);
}

function hasRenderableSiteContent(content: SiteContent): boolean {
  return (
    content.notices.length > 0 ||
    content.quickLinks.length > 0 ||
    content.gallery.length > 0
  );
}

export async function fetchPublishedSiteContent(): Promise<SiteContent> {
  const supabaseConfig = getSupabasePublicConfig();

  if (supabaseConfig.enabled) {
    const [supabaseResult, jsonResult] = await Promise.allSettled([
      fetchSupabasePublishedSiteContent(),
      fetchPublishedSiteContentFromJson()
    ]);

    if (supabaseResult.status === "fulfilled") {
      const supabaseContent = supabaseResult.value;
      const fallbackContent =
        jsonResult.status === "fulfilled"
          ? jsonResult.value
          : normalizeSiteContent();

      if (hasRenderableSiteContent(supabaseContent)) {
        return normalizeSiteContent({
          updatedAt: supabaseContent.updatedAt || fallbackContent.updatedAt,
          notices:
            supabaseContent.notices.length > 0
              ? supabaseContent.notices
              : fallbackContent.notices,
          quickLinks:
            supabaseContent.quickLinks.length > 0
              ? supabaseContent.quickLinks
              : fallbackContent.quickLinks,
          gallery:
            supabaseContent.gallery.length > 0
              ? supabaseContent.gallery
              : fallbackContent.gallery
        });
      }

      console.info("Supabase respondeu sem conteúdo suficiente. Mantendo fallback para o JSON local.");
    } else {
      console.warn("Falha ao carregar conteúdo público via Supabase. Usando fallback local.", supabaseResult.reason);
    }

    if (jsonResult.status === "fulfilled") {
      return jsonResult.value;
    }
  }

  return fetchPublishedSiteContentFromJson();
}

export async function loadEditorSiteContent(): Promise<SiteContent> {
  const draft = readDraftSiteContent();
  if (draft) {
    return draft;
  }

  return fetchPublishedSiteContent();
}

export function getGitHubPublishToken(): string {
  return sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
}

export function setGitHubPublishToken(token: string): void {
  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token.trim());
}

export function clearGitHubPublishToken(): void {
  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function encodeUtf8ToBase64(value: string): string {
  return encodeBytesToBase64(new TextEncoder().encode(value));
}

async function githubRequest<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new GitHubApiError(`GitHub API ${response.status}: ${message}`, response.status, {
      retryAfter: response.headers.get("retry-after"),
      rateRemaining: response.headers.get("x-ratelimit-remaining"),
      rateReset: response.headers.get("x-ratelimit-reset")
    });
  }

  return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRetryDelayMs(error: GitHubApiError, attempt: number): number {
  const retryAfterSeconds = Number(error.headers.retryAfter || 0);
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(1500 * 2 ** attempt, 8000);
}

function buildRepositoryContentUrl(
  path: string,
  ref: string = GITHUB_REPO_CONFIG.branch
): string {
  return `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}?ref=${ref}`;
}

async function fetchRepositoryContentMeta(
  token: string,
  path: string
): Promise<GitHubRepositoryEntry> {
  return githubRequest<GitHubRepositoryEntry>(buildRepositoryContentUrl(path), token, {
    method: "GET"
  });
}

async function fetchRepositoryContentMetaIfExists(
  token: string,
  path: string
): Promise<GitHubRepositoryEntry | null> {
  try {
    return await fetchRepositoryContentMeta(token, path);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function upsertRepositoryBase64Content(
  token: string,
  path: string,
  contentBase64: string,
  commitMessage: string,
  maxRetries = 2
): Promise<GitHubContentWriteResponse> {
  const url = `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const currentFile = await fetchRepositoryContentMetaIfExists(token, path);
    const body: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: commitMessage,
      content: contentBase64,
      branch: GITHUB_REPO_CONFIG.branch
    };

    if (currentFile?.sha) {
      body.sha = currentFile.sha;
    }

    try {
      return await githubRequest<GitHubContentWriteResponse>(url, token, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      const shouldRetry =
        error instanceof GitHubApiError &&
        (error.status === 409 || error.status === 422 || error.status === 503) &&
        attempt < maxRetries;

      if (!shouldRetry) {
        throw error;
      }

      await sleep(getRetryDelayMs(error, attempt));
    }
  }

  throw new Error("Falha inesperada ao publicar conteúdo no GitHub.");
}

export async function fetchPublishedSiteContentMeta(
  token: string
): Promise<GitHubRepositoryEntry> {
  return fetchRepositoryContentMeta(token, GITHUB_REPO_CONFIG.path);
}

export async function publishSiteContentToGitHub(
  content: Partial<SiteContent> | SiteContent,
  token: string,
  commitMessage = "Update site content",
  maxRetries = 2
): Promise<GitHubContentWriteResponse> {
  const normalized = normalizeSiteContent(content);
  return upsertRepositoryBase64Content(
    token,
    GITHUB_REPO_CONFIG.path,
    encodeUtf8ToBase64(`${JSON.stringify(normalized, null, 2)}\n`),
    commitMessage,
    maxRetries
  );
}

export function isAllowedPortalImageFileName(fileName = ""): boolean {
  return IMAGE_EXTENSION_PATTERN.test(fileName);
}

export function normalizePortalImageLibraryEntries(
  entries?: Partial<PortalImageLibraryEntry>[] | null
): PortalImageLibraryEntry[] {
  const safeEntries = entries || [];
  const seen = new Set<string>();

  return safeEntries
    .filter(
      (entry): entry is Partial<PortalImageLibraryEntry> & { path: string } =>
        Boolean(entry?.path) && isAllowedPortalImageFileName(entry.path)
    )
    .map((entry) => ({
      path: entry.path,
      name: entry.name || entry.path.split("/").pop() || "imagem",
      previewSrc: entry.previewSrc || entry.path,
      source: entry.source || "repository"
    }))
    .filter((entry) => {
      if (seen.has(entry.path)) {
        return false;
      }

      seen.add(entry.path);
      return true;
    })
    .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"));
}

export async function listRepositoryDirectory(
  token: string,
  path: string
): Promise<GitHubRepositoryEntry[]> {
  try {
    const contents = await githubRequest<unknown>(buildRepositoryContentUrl(path), token, {
      method: "GET"
    });
    return Array.isArray(contents) ? (contents as GitHubRepositoryEntry[]) : [];
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function listPortalImageLibrary(
  token: string
): Promise<PortalImageLibraryEntry[]> {
  const directoryLists = await Promise.all(
    PORTAL_IMAGE_DIRECTORIES.map((directory) => listRepositoryDirectory(token, directory))
  );

  return normalizePortalImageLibraryEntries(
    directoryLists.flat().flatMap((item) => {
      if (item?.type !== "file" || !isAllowedPortalImageFileName(item.name || item.path || "")) {
        return [];
      }

      return [
        {
          path: item.path,
          name: item.name || item.path.split("/").pop() || "imagem",
          previewSrc: item.path,
          source: "repository" as const
        }
      ];
    })
  );
}

export function createPortalImagePath(title: string, originalFileName: string): string {
  const date = new Date();
  const timestamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("");
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const extension = (originalFileName.split(".").pop() || "jpg").toLowerCase();
  const baseLabel =
    (title || originalFileName.replace(/\.[^.]+$/, "") || "imagem")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "imagem";

  return `${PORTAL_IMAGE_UPLOAD_DIR}/portal-${timestamp}-${randomSuffix}-${baseLabel}.${extension}`;
}

export async function uploadPortalImageToGitHub(
  file: File,
  token: string,
  path: string,
  commitMessage = "Upload portal image"
): Promise<{ path: string; response: GitHubContentWriteResponse }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploadedFile = await upsertRepositoryBase64Content(
    token,
    path,
    encodeBytesToBase64(bytes),
    commitMessage
  );

  return {
    path,
    response: uploadedFile
  };
}
