// @ts-check

import { SITE_CONTENT_STORAGE_KEY } from "./auth.js";

/** @typedef {import("../types/core").GitHubContentWriteResponse} GitHubContentWriteResponse */
/** @typedef {import("../types/core").GitHubRateHeaders} GitHubRateHeaders */
/** @typedef {import("../types/core").GitHubRepositoryEntry} GitHubRepositoryEntry */
/** @typedef {import("../types/core").PortalImageLibraryEntry} PortalImageLibraryEntry */
/** @typedef {import("../types/core").SiteContent} SiteContent */

export const SITE_CONTENT_SOURCE = "data/site-content.json";
/** @type {readonly string[]} */
export const PORTAL_IMAGE_DIRECTORIES = ["assets/images/portal", "assets/images"];
export const PORTAL_IMAGE_UPLOAD_DIR = "assets/images/portal";
export const GITHUB_REPO_CONFIG = {
  owner: "GustavoRodriguesAlves",
  repo: "Ceeja-Paulo-Decourt",
  branch: "main",
  path: SITE_CONTENT_SOURCE
};

const GITHUB_TOKEN_STORAGE_KEY = "ceeja_github_publish_token";
const IMAGE_EXTENSION_PATTERN = /\.(jpg|jpeg|png|webp)$/i;

class GitHubApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {GitHubRateHeaders} [headers]
   */
  constructor(message, status, headers = {}) {
    super(message);
    this.name = "GitHubApiError";
    /** @type {number} */
    this.status = status;
    /** @type {GitHubRateHeaders} */
    this.headers = headers;
  }
}

/**
 * @param {Partial<SiteContent> | null | undefined} [raw]
 * @returns {SiteContent}
 */
export function normalizeSiteContent(raw = {}) {
  return {
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    notices: Array.isArray(raw.notices) ? raw.notices : [],
    quickLinks: Array.isArray(raw.quickLinks) ? raw.quickLinks : [],
    gallery: Array.isArray(raw.gallery) ? raw.gallery : []
  };
}

/**
 * @returns {SiteContent | null}
 */
export function readDraftSiteContent() {
  const draft = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
  if (!draft) {
    return null;
  }

  try {
    return normalizeSiteContent(/** @type {Partial<SiteContent>} */ (JSON.parse(draft)));
  } catch (error) {
    console.warn("Falha ao ler conteúdo local salvo.", error);
    return null;
  }
}

/**
 * @param {Partial<SiteContent> | SiteContent} content
 * @returns {void}
 */
export function saveDraftSiteContent(content) {
  localStorage.setItem(
    SITE_CONTENT_STORAGE_KEY,
    JSON.stringify(normalizeSiteContent(content))
  );
}

/**
 * @returns {void}
 */
export function clearDraftSiteContent() {
  localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
}

/**
 * @returns {Promise<SiteContent>}
 */
export async function fetchPublishedSiteContent() {
  const response = await fetch(SITE_CONTENT_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return normalizeSiteContent(
    /** @type {Partial<SiteContent>} */ (await response.json())
  );
}

/**
 * @returns {Promise<SiteContent>}
 */
export async function loadEditorSiteContent() {
  const draft = readDraftSiteContent();
  if (draft) {
    return draft;
  }

  return fetchPublishedSiteContent();
}

/**
 * @returns {string}
 */
export function getGitHubPublishToken() {
  return sessionStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
}

/**
 * @param {string} token
 * @returns {void}
 */
export function setGitHubPublishToken(token) {
  sessionStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token.trim());
}

/**
 * @returns {void}
 */
export function clearGitHubPublishToken() {
  sessionStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function encodeBytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * @param {string} value
 * @returns {string}
 */
function encodeUtf8ToBase64(value) {
  return encodeBytesToBase64(new TextEncoder().encode(value));
}

/**
 * @template T
 * @param {string} url
 * @param {string} token
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
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

  return /** @type {Promise<T>} */ (response.json());
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * @param {GitHubApiError} error
 * @param {number} attempt
 * @returns {number}
 */
function getRetryDelayMs(error, attempt) {
  const retryAfterSeconds = Number(error.headers.retryAfter || 0);
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(1500 * 2 ** attempt, 8000);
}

/**
 * @param {string} path
 * @param {string} [ref]
 * @returns {string}
 */
function buildRepositoryContentUrl(path, ref = GITHUB_REPO_CONFIG.branch) {
  return `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}?ref=${ref}`;
}

/**
 * @param {string} token
 * @param {string} path
 * @returns {Promise<GitHubRepositoryEntry>}
 */
async function fetchRepositoryContentMeta(token, path) {
  return githubRequest(buildRepositoryContentUrl(path), token, { method: "GET" });
}

/**
 * @param {string} token
 * @param {string} path
 * @returns {Promise<GitHubRepositoryEntry | null>}
 */
async function fetchRepositoryContentMetaIfExists(token, path) {
  try {
    return await fetchRepositoryContentMeta(token, path);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * @param {string} token
 * @param {string} path
 * @param {string} contentBase64
 * @param {string} commitMessage
 * @param {number} [maxRetries=2]
 * @returns {Promise<GitHubContentWriteResponse>}
 */
async function upsertRepositoryBase64Content(
  token,
  path,
  contentBase64,
  commitMessage,
  maxRetries = 2
) {
  const url = `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const currentFile = await fetchRepositoryContentMetaIfExists(token, path);
    /** @type {{ message: string; content: string; branch: string; sha?: string }} */
    const body = {
      message: commitMessage,
      content: contentBase64,
      branch: GITHUB_REPO_CONFIG.branch
    };

    if (currentFile?.sha) {
      body.sha = currentFile.sha;
    }

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

/**
 * @param {string} token
 * @returns {Promise<GitHubRepositoryEntry>}
 */
export async function fetchPublishedSiteContentMeta(token) {
  return fetchRepositoryContentMeta(token, GITHUB_REPO_CONFIG.path);
}

/**
 * @param {Partial<SiteContent> | SiteContent} content
 * @param {string} token
 * @param {string} [commitMessage="Update site content"]
 * @param {number} [maxRetries=2]
 * @returns {Promise<GitHubContentWriteResponse>}
 */
export async function publishSiteContentToGitHub(
  content,
  token,
  commitMessage = "Update site content",
  maxRetries = 2
) {
  const normalized = normalizeSiteContent(content);
  return upsertRepositoryBase64Content(
    token,
    GITHUB_REPO_CONFIG.path,
    encodeUtf8ToBase64(`${JSON.stringify(normalized, null, 2)}\n`),
    commitMessage,
    maxRetries
  );
}

/**
 * @param {string} [fileName=""]
 * @returns {boolean}
 */
export function isAllowedPortalImageFileName(fileName = "") {
  return IMAGE_EXTENSION_PATTERN.test(fileName);
}

/**
 * @param {Partial<PortalImageLibraryEntry>[] | null | undefined} [entries]
 * @returns {PortalImageLibraryEntry[]}
 */
export function normalizePortalImageLibraryEntries(entries = []) {
  const seen = new Set();

  return entries
    .filter((entry) => entry && entry.path && isAllowedPortalImageFileName(entry.path))
    .map((entry) => ({
      path: /** @type {string} */ (entry.path),
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

/**
 * @param {string} token
 * @param {string} path
 * @returns {Promise<GitHubRepositoryEntry[]>}
 */
export async function listRepositoryDirectory(token, path) {
  try {
    const contents = await githubRequest(buildRepositoryContentUrl(path), token, {
      method: "GET"
    });
    return Array.isArray(contents) ? contents : [];
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

/**
 * @param {string} token
 * @returns {Promise<PortalImageLibraryEntry[]>}
 */
export async function listPortalImageLibrary(token) {
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
          source: "repository"
        }
      ];
    })
  );
}

/**
 * @param {string} title
 * @param {string} originalFileName
 * @returns {string}
 */
export function createPortalImagePath(title, originalFileName) {
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

/**
 * @param {File} file
 * @param {string} token
 * @param {string} path
 * @param {string} [commitMessage="Upload portal image"]
 * @returns {Promise<{ path: string; response: GitHubContentWriteResponse }>}
 */
export async function uploadPortalImageToGitHub(
  file,
  token,
  path,
  commitMessage = "Upload portal image"
) {
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
