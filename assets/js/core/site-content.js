import { SITE_CONTENT_STORAGE_KEY } from "./auth.js";
import { fetchSupabasePublishedSiteContent, getSupabasePublicConfig } from "./supabase.js";
export const SITE_CONTENT_SOURCE = "data/site-content.json";
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
    status;
    headers;
    constructor(message, status, headers = {}) {
        super(message);
        this.name = "GitHubApiError";
        this.status = status;
        this.headers = headers;
    }
}
export function normalizeSiteContent(raw) {
    const safeRaw = raw || {};
    return {
        updatedAt: typeof safeRaw.updatedAt === "string"
            ? safeRaw.updatedAt
            : new Date().toISOString(),
        notices: Array.isArray(safeRaw.notices) ? safeRaw.notices : [],
        quickLinks: Array.isArray(safeRaw.quickLinks) ? safeRaw.quickLinks : [],
        gallery: Array.isArray(safeRaw.gallery) ? safeRaw.gallery : []
    };
}
export function readDraftSiteContent() {
    const draft = localStorage.getItem(SITE_CONTENT_STORAGE_KEY);
    if (!draft) {
        return null;
    }
    try {
        return normalizeSiteContent(JSON.parse(draft));
    }
    catch (error) {
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
export async function fetchPublishedSiteContentFromJson() {
    const response = await fetch(SITE_CONTENT_SOURCE, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return normalizeSiteContent((await response.json()));
}
function hasRenderableSiteContent(content) {
    return (content.notices.length > 0 ||
        content.quickLinks.length > 0 ||
        content.gallery.length > 0);
}
export async function fetchPublishedSiteContent() {
    const supabaseConfig = getSupabasePublicConfig();
    if (supabaseConfig.enabled) {
        try {
            const supabaseContent = await fetchSupabasePublishedSiteContent();
            if (hasRenderableSiteContent(supabaseContent)) {
                return supabaseContent;
            }
            console.info("Supabase respondeu sem conteúdo publicado. Mantendo fallback para o JSON local.");
        }
        catch (error) {
            console.warn("Falha ao carregar conteúdo público via Supabase. Usando fallback local.", error);
        }
    }
    return fetchPublishedSiteContentFromJson();
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
function encodeBytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}
function encodeUtf8ToBase64(value) {
    return encodeBytesToBase64(new TextEncoder().encode(value));
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
    const retryAfterSeconds = Number(error.headers.retryAfter || 0);
    if (retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
    }
    return Math.min(1500 * 2 ** attempt, 8000);
}
function buildRepositoryContentUrl(path, ref = GITHUB_REPO_CONFIG.branch) {
    return `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}?ref=${ref}`;
}
async function fetchRepositoryContentMeta(token, path) {
    return githubRequest(buildRepositoryContentUrl(path), token, {
        method: "GET"
    });
}
async function fetchRepositoryContentMetaIfExists(token, path) {
    try {
        return await fetchRepositoryContentMeta(token, path);
    }
    catch (error) {
        if (error instanceof GitHubApiError && error.status === 404) {
            return null;
        }
        throw error;
    }
}
async function upsertRepositoryBase64Content(token, path, contentBase64, commitMessage, maxRetries = 2) {
    const url = `https://api.github.com/repos/${GITHUB_REPO_CONFIG.owner}/${GITHUB_REPO_CONFIG.repo}/contents/${path}`;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const currentFile = await fetchRepositoryContentMetaIfExists(token, path);
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
        }
        catch (error) {
            const shouldRetry = error instanceof GitHubApiError &&
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
export async function fetchPublishedSiteContentMeta(token) {
    return fetchRepositoryContentMeta(token, GITHUB_REPO_CONFIG.path);
}
export async function publishSiteContentToGitHub(content, token, commitMessage = "Update site content", maxRetries = 2) {
    const normalized = normalizeSiteContent(content);
    return upsertRepositoryBase64Content(token, GITHUB_REPO_CONFIG.path, encodeUtf8ToBase64(`${JSON.stringify(normalized, null, 2)}\n`), commitMessage, maxRetries);
}
export function isAllowedPortalImageFileName(fileName = "") {
    return IMAGE_EXTENSION_PATTERN.test(fileName);
}
export function normalizePortalImageLibraryEntries(entries) {
    const safeEntries = entries || [];
    const seen = new Set();
    return safeEntries
        .filter((entry) => Boolean(entry?.path) && isAllowedPortalImageFileName(entry.path))
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
export async function listRepositoryDirectory(token, path) {
    try {
        const contents = await githubRequest(buildRepositoryContentUrl(path), token, {
            method: "GET"
        });
        return Array.isArray(contents) ? contents : [];
    }
    catch (error) {
        if (error instanceof GitHubApiError && error.status === 404) {
            return [];
        }
        throw error;
    }
}
export async function listPortalImageLibrary(token) {
    const directoryLists = await Promise.all(PORTAL_IMAGE_DIRECTORIES.map((directory) => listRepositoryDirectory(token, directory)));
    return normalizePortalImageLibraryEntries(directoryLists.flat().flatMap((item) => {
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
    }));
}
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
    const baseLabel = (title || originalFileName.replace(/\.[^.]+$/, "") || "imagem")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "imagem";
    return `${PORTAL_IMAGE_UPLOAD_DIR}/portal-${timestamp}-${randomSuffix}-${baseLabel}.${extension}`;
}
export async function uploadPortalImageToGitHub(file, token, path, commitMessage = "Upload portal image") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploadedFile = await upsertRepositoryBase64Content(token, path, encodeBytesToBase64(bytes), commitMessage);
    return {
        path,
        response: uploadedFile
    };
}
