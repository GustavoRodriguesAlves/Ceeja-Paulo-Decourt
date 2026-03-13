import { SITE_CONTENT_STORAGE_KEY } from "./auth.js";

export const SITE_CONTENT_SOURCE = "data/site-content.json";

export function normalizeSiteContent(raw = {}) {
  return {
    updatedAt: raw.updatedAt || new Date().toISOString(),
    notices: Array.isArray(raw.notices) ? raw.notices : [],
    quickLinks: Array.isArray(raw.quickLinks) ? raw.quickLinks : [],
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],
    homepage: raw.homepage || {
      highlightTitle: "",
      highlightText: ""
    }
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

export async function fetchPublishedSiteContent() {
  const response = await fetch(SITE_CONTENT_SOURCE, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return normalizeSiteContent(await response.json());
}

export async function loadSiteContent() {
  const draft = readDraftSiteContent();
  if (draft) {
    return draft;
  }

  return fetchPublishedSiteContent();
}

export function saveDraftSiteContent(content) {
  localStorage.setItem(SITE_CONTENT_STORAGE_KEY, JSON.stringify(normalizeSiteContent(content)));
}

export function clearDraftSiteContent() {
  localStorage.removeItem(SITE_CONTENT_STORAGE_KEY);
}
