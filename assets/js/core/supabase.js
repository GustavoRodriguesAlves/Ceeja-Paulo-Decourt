import { normalizeSiteContent } from "./site-content.js";
import { SUPABASE_CONFIG, isSupabaseConfigReady } from "./supabase-config.js";
export const SUPABASE_TABLES = {
    notices: "notices",
    quickLinks: "quick_links",
    gallery: "gallery_items"
};
function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}
function encodeStoragePath(path) {
    return path
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}
function resolvePublicImageUrl(path) {
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
function buildRestUrl(table, query) {
    const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
    return `${baseUrl}/rest/v1/${table}?${query.toString()}`;
}
async function fetchSupabaseRows(table, query) {
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
    return (await response.json());
}
function mapNotices(rows) {
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
function mapQuickLinks(rows) {
    return rows.map((row) => ({
        id: row.id,
        label: row.label,
        url: row.url,
        published: Boolean(row.published)
    }));
}
function mapGallery(rows) {
    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        src: resolvePublicImageUrl(row.image_path),
        alt: row.alt,
        order: Number(row.sort_order || 0),
        published: Boolean(row.published)
    }));
}
export function getSupabasePublicConfig() {
    return { ...SUPABASE_CONFIG };
}
export async function fetchSupabasePublishedSiteContent() {
    const [noticeRows, quickLinkRows, galleryRows] = await Promise.all([
        fetchSupabaseRows(SUPABASE_TABLES.notices, new URLSearchParams({
            select: "id,title,summary,category,date,featured,published",
            published: "eq.true",
            order: "featured.desc,date.desc"
        })),
        fetchSupabaseRows(SUPABASE_TABLES.quickLinks, new URLSearchParams({
            select: "id,label,url,published",
            published: "eq.true",
            order: "created_at.desc"
        })),
        fetchSupabaseRows(SUPABASE_TABLES.gallery, new URLSearchParams({
            select: "id,title,alt,image_path,sort_order,published",
            published: "eq.true",
            order: "sort_order.asc,created_at.asc"
        }))
    ]);
    return normalizeSiteContent({
        updatedAt: new Date().toISOString(),
        notices: mapNotices(noticeRows),
        quickLinks: mapQuickLinks(quickLinkRows),
        gallery: mapGallery(galleryRows)
    });
}
