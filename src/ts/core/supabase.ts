import type {
  GalleryItem,
  NoticeItem,
  QuickLinkItem,
  SiteContent
} from "../../../assets/js/types/core";
import { normalizeSiteContent } from "./site-content.js";
import { SUPABASE_CONFIG, type SupabasePublicConfig, isSupabaseConfigReady } from "./supabase-config.js";

type SupabaseNoticeRow = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  featured: boolean;
  published: boolean;
};

type SupabaseQuickLinkRow = {
  id: string;
  label: string;
  url: string;
  published: boolean;
};

type SupabaseGalleryRow = {
  id: string;
  title: string;
  alt: string;
  image_path: string;
  sort_order: number;
  published: boolean;
};

export const SUPABASE_TABLES = {
  notices: "notices",
  quickLinks: "quick_links",
  gallery: "gallery_items"
} as const;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function resolvePublicImageUrl(path: string): string {
  if (!path) {
    return "";
  }

  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith("assets/")) {
    return path;
  }

  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  const bucket = encodeURIComponent(SUPABASE_CONFIG.storageBucket);
  const encodedPath = encodeStoragePath(path);
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function buildRestUrl(table: string, query: URLSearchParams): string {
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  return `${baseUrl}/rest/v1/${table}?${query.toString()}`;
}

async function fetchSupabaseRows<T>(table: string, query: URLSearchParams): Promise<T[]> {
  if (!isSupabaseConfigReady()) {
    throw new Error("Supabase ainda não foi configurado para leitura pública.");
  }

  const response = await fetch(buildRestUrl(table, query), {
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.publishableKey}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${response.status}: ${details}`);
  }

  return (await response.json()) as T[];
}

function mapNotices(rows: SupabaseNoticeRow[]): NoticeItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    date: row.date,
    featured: Boolean(row.featured),
    published: Boolean(row.published)
  }));
}

function mapQuickLinks(rows: SupabaseQuickLinkRow[]): QuickLinkItem[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.url,
    published: Boolean(row.published)
  }));
}

function mapGallery(rows: SupabaseGalleryRow[]): GalleryItem[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    src: resolvePublicImageUrl(row.image_path),
    alt: row.alt,
    order: Number(row.sort_order || 0),
    published: Boolean(row.published)
  }));
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return { ...SUPABASE_CONFIG };
}

export async function fetchSupabasePublishedSiteContent(): Promise<SiteContent> {
  const [noticeRows, quickLinkRows, galleryRows] = await Promise.all([
    fetchSupabaseRows<SupabaseNoticeRow>(
      SUPABASE_TABLES.notices,
      new URLSearchParams({
        select: "id,title,summary,category,date,featured,published",
        published: "eq.true",
        order: "featured.desc,date.desc"
      })
    ),
    fetchSupabaseRows<SupabaseQuickLinkRow>(
      SUPABASE_TABLES.quickLinks,
      new URLSearchParams({
        select: "id,label,url,published",
        published: "eq.true",
        order: "created_at.desc"
      })
    ),
    fetchSupabaseRows<SupabaseGalleryRow>(
      SUPABASE_TABLES.gallery,
      new URLSearchParams({
        select: "id,title,alt,image_path,sort_order,published",
        published: "eq.true",
        order: "sort_order.asc,created_at.asc"
      })
    )
  ]);

  return normalizeSiteContent({
    updatedAt: new Date().toISOString(),
    notices: mapNotices(noticeRows),
    quickLinks: mapQuickLinks(quickLinkRows),
    gallery: mapGallery(galleryRows)
  });
}
