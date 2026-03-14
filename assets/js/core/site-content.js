import { SITE_CONTENT_STORAGE_KEY } from "./auth.js";

export const SITE_CONTENT_SOURCE = "data/site-content.json";
export const GITHUB_REPO_CONFIG = {
  owner: "GustavoRodriguesAlves",
  repo: "Ceeja-Paulo-Decourt",
  branch: "main",
  path: SITE_CONTENT_SOURCE
};

const GITHUB_TOKEN_STORAGE_KEY = "ceeja_github_publish_token";

class GitHubApiError extends Error {
  constructor(message, status, headers = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.headers = headers;
  }
}

export function normalizeSiteContent(raw = {}) {
  return {
    updatedAt: raw.updatedAt || new Date().toISOString(),
    notices: Array.isArray(raw.notices) ? raw.notices : [],
    quickLinks: Array.isArray(raw.quickLinks) ? raw.quickLinks : [],
    gallery: Array.isArray(raw.gallery) ? raw.gallery : []
  };
}

export function readDraftSiteContent() {
  const draft = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
  if (!draft) {
    return null;
  }

  try {
    return normalizeSiteContent(JSON.parse(draft));
  } catch (error) {
    console.warn("Falha ao ler conteúdo local salvo.", error);
    return null;
  }
}

export function saveDraftSiteContent(content) {
  localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(normalizeSiteContent(content)));
}

export function clearDraftSiteContent() {
  localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
}

export async function fetchPublishedSiteContent() {
  const response = await fetch(SITE_CONTENT_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return normalizeSiteContent(await response.json());
}

export async function loadEditorSiteContent() {
  const draft = readDraftSiteContent();
  if (draft) {
    return draft;
  }

  return fetchPublishedSiteContent();
}

export function getGitHubPublishToken() {
  return sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
}

export function setGitHubPublishToken(token) {
  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token.trim());
}

export function clearGitHubPublishToken() {
  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
}

function encodeUtf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function githubRequest(url, token, options = {}) {
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

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRetryDelayMs(error, attempt) {
  const retryAfterSeconds = Number(error?.headers?.retryAfter || 0);
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(1500 * 2 ** attempt, 8000);
}

export async function fetchPublishedSiteContentMeta(token) {
  const url = `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${GITHUB_REPO_CONFIG.path}?ref=${GITHUB_REPO_CONFIG.branch}`;
  return githubRequest(url, token, { method: "GET" });
}

export async function publishSiteContentToGitHub(
  content,
  token,
  commitMessage = "Update site content",
  maxRetries = 2
) {
  const normalized = normalizeSiteContent(content);
  const url = `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${GITHUB_REPO_CONFIG.path}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const currentFile = await fetchPublishedSiteContentMeta(token);
    const body = {
      message: commitMessage,
      content: encodeUtf8ToBase64(`${JSON.stringify(normalized, null, 2)}\n`),
      branch: GITHUB_REPO_CONFIG.branch,
      sha: currentFile.sha
    };

    try {
      return await githubRequest(url, token, {
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
