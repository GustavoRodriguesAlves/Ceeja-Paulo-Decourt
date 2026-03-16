import { SITE_CONTENT_STORAGE_KEY } from "./auth.js";
import { fetchSupabasePublishedSiteContent, getSupabasePublicConfig } from "./supabase.js";
import type { PortalImageLibraryEntry, SiteContent } from "../../../assets/js/types/core";

export const SITE_CONTENT_SOURCE = "data/site-content.json";
export const PORTAL_IMAGE_UPLOAD_DIR = "assets/images/portal";

const IMAGE_EXTENSION_PATTERN = /\.(jpg|jpeg|png|webp)$/i;

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
    try {
      const supabaseContent = await fetchSupabasePublishedSiteContent();

      if (hasRenderableSiteContent(supabaseContent)) {
        return normalizeSiteContent(supabaseContent);
      }

      console.info("Supabase respondeu sem conteúdo suficiente. Mantendo fallback para o JSON local.");
    } catch (error) {
      console.warn("Falha ao carregar conteúdo público via Supabase. Usando fallback local.", error);
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
