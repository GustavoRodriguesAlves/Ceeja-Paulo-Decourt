import { normalizeSiteContent } from "./site-content.js";
import { SUPABASE_CONFIG, isSupabaseConfigReady } from "./supabase-config.js";
export const SUPABASE_TABLES = {
    notices: "notices",
    quickLinks: "quick_links",
    gallery: "gallery_items"
};
const SUPABASE_ADMIN_SESSION_KEY = "ceeja_supabase_admin_session";
const SUPABASE_ADMIN_REMEMBER_KEY = "ceeja_supabase_admin_session_remembered";
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
function buildAuthUrl(path) {
    const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
    return `${baseUrl}/auth/v1/${path}`;
}
function readStoredSession(raw) {
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.accessToken !== "string" ||
            typeof parsed.refreshToken !== "string" ||
            typeof parsed.expiresAt !== "number" ||
            typeof parsed.email !== "string") {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function saveSupabaseAdminSession(session, remember) {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(SUPABASE_ADMIN_SESSION_KEY, serialized);
    if (remember) {
        localStorage.setItem(SUPABASE_ADMIN_REMEMBER_KEY, serialized);
    }
    else {
        localStorage.removeItem(SUPABASE_ADMIN_REMEMBER_KEY);
    }
}
export function getSupabaseAdminSession() {
    return readStoredSession(sessionStorage.getItem(SUPABASE_ADMIN_SESSION_KEY));
}
export function getRememberedSupabaseAdminSession() {
    return readStoredSession(localStorage.getItem(SUPABASE_ADMIN_REMEMBER_KEY));
}
export function syncRememberedSupabaseAdminSession() {
    const currentSession = getSupabaseAdminSession();
    if (currentSession) {
        return currentSession;
    }
    const rememberedSession = getRememberedSupabaseAdminSession();
    if (rememberedSession) {
        sessionStorage.setItem(SUPABASE_ADMIN_SESSION_KEY, JSON.stringify(rememberedSession));
    }
    return rememberedSession;
}
export function clearSupabaseAdminSession() {
    sessionStorage.removeItem(SUPABASE_ADMIN_SESSION_KEY);
    localStorage.removeItem(SUPABASE_ADMIN_REMEMBER_KEY);
}
function normalizeAuthSessionResponse(payload) {
    const accessToken = String(payload.access_token || "");
    const refreshToken = String(payload.refresh_token || "");
    const expiresAt = typeof payload.expires_at === "number"
        ? payload.expires_at
        : Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
    const user = payload.user;
    const email = String(user?.email || "");
    if (!accessToken || !refreshToken || !email) {
        throw new Error("A resposta do Supabase não trouxe uma sessão válida.");
    }
    return {
        accessToken,
        refreshToken,
        expiresAt,
        email
    };
}
export async function signInSupabaseAdmin(email, password, remember = false) {
    if (!isSupabaseConfigReady()) {
        throw new Error("Supabase ainda não foi configurado.");
    }
    const response = await fetch(buildAuthUrl("token?grant_type=password"), {
        method: "POST",
        headers: {
            apikey: SUPABASE_CONFIG.publishableKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    });
    const payload = (await response.json());
    if (!response.ok) {
        throw new Error(String(payload.msg || payload.error_description || payload.error || "Falha ao autenticar no Supabase."));
    }
    const session = normalizeAuthSessionResponse(payload);
    saveSupabaseAdminSession(session, remember);
    return session;
}
async function refreshSupabaseAdminSession() {
    const session = getSupabaseAdminSession() || getRememberedSupabaseAdminSession();
    if (!session) {
        throw new Error("Não existe sessão do Supabase para renovar.");
    }
    const response = await fetch(buildAuthUrl("token?grant_type=refresh_token"), {
        method: "POST",
        headers: {
            apikey: SUPABASE_CONFIG.publishableKey,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            refresh_token: session.refreshToken
        })
    });
    const payload = (await response.json());
    if (!response.ok) {
        clearSupabaseAdminSession();
        throw new Error(String(payload.msg || payload.error_description || payload.error || "Falha ao renovar sessão do Supabase."));
    }
    const refreshed = normalizeAuthSessionResponse(payload);
    saveSupabaseAdminSession(refreshed, Boolean(localStorage.getItem(SUPABASE_ADMIN_REMEMBER_KEY)));
    return refreshed;
}
export async function getSupabaseAdminAccessToken() {
    const session = getSupabaseAdminSession() || syncRememberedSupabaseAdminSession();
    if (!session) {
        throw new Error("Nenhuma sessão ativa do Supabase foi encontrada.");
    }
    const now = Math.floor(Date.now() / 1000);
    if (session.expiresAt <= now + 60) {
        const refreshed = await refreshSupabaseAdminSession();
        return refreshed.accessToken;
    }
    return session.accessToken;
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
async function fetchSupabaseAdminRows(table, query) {
    const accessToken = await getSupabaseAdminAccessToken();
    const response = await fetch(buildRestUrl(table, query), {
        headers: {
            apikey: SUPABASE_CONFIG.publishableKey,
            Authorization: `Bearer ${accessToken}`,
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
async function upsertSupabaseAdminRows(table, rows) {
    const accessToken = await getSupabaseAdminAccessToken();
    const query = new URLSearchParams({
        on_conflict: "id",
        select: "*"
    });
    const response = await fetch(buildRestUrl(table, query), {
        method: "POST",
        headers: {
            apikey: SUPABASE_CONFIG.publishableKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify(rows)
    });
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Supabase ${response.status}: ${details}`);
    }
    return (await response.json());
}
async function deleteSupabaseAdminRows(table, ids) {
    if (!ids.length) {
        return;
    }
    const accessToken = await getSupabaseAdminAccessToken();
    const query = new URLSearchParams({
        id: `in.(${ids.join(",")})`
    });
    const response = await fetch(buildRestUrl(table, query), {
        method: "DELETE",
        headers: {
            apikey: SUPABASE_CONFIG.publishableKey,
            Authorization: `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Supabase ${response.status}: ${details}`);
    }
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function ensureSupabaseRecordId(value) {
    return isUuid(value) ? value : crypto.randomUUID();
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
export async function fetchSupabaseEditorSiteContent() {
    const [noticeRows, quickLinkRows, galleryRows] = await Promise.all([
        fetchSupabaseAdminRows(SUPABASE_TABLES.notices, new URLSearchParams({
            select: "id,title,summary,category,date,featured,published",
            order: "featured.desc,date.desc"
        })),
        fetchSupabaseAdminRows(SUPABASE_TABLES.quickLinks, new URLSearchParams({
            select: "id,label,url,published",
            order: "created_at.desc"
        })),
        fetchSupabaseAdminRows(SUPABASE_TABLES.gallery, new URLSearchParams({
            select: "id,title,alt,image_path,sort_order,published",
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
export async function syncSupabaseNotices(notices) {
    const existingRows = await fetchSupabaseAdminRows(SUPABASE_TABLES.notices, new URLSearchParams({
        select: "id"
    }));
    const payload = notices.map((notice) => ({
        id: ensureSupabaseRecordId(notice.id),
        title: notice.title,
        summary: notice.summary,
        category: notice.category,
        date: notice.date,
        featured: notice.featured,
        published: notice.published
    }));
    const persistedRows = payload.length
        ? await upsertSupabaseAdminRows(SUPABASE_TABLES.notices, payload)
        : [];
    const payloadIds = new Set(payload.map((item) => item.id));
    const deleteIds = existingRows
        .map((row) => row.id)
        .filter((id) => !payloadIds.has(id));
    await deleteSupabaseAdminRows(SUPABASE_TABLES.notices, deleteIds);
    const persistedById = new Map(mapNotices(persistedRows).map((item) => [item.id, item]));
    return payload.map((item) => persistedById.get(item.id) || mapNotices([item])[0]);
}
export async function syncSupabaseQuickLinks(links) {
    const existingRows = await fetchSupabaseAdminRows(SUPABASE_TABLES.quickLinks, new URLSearchParams({
        select: "id"
    }));
    const payload = links.map((link) => ({
        id: ensureSupabaseRecordId(link.id),
        label: link.label,
        url: link.url,
        published: link.published
    }));
    const persistedRows = payload.length
        ? await upsertSupabaseAdminRows(SUPABASE_TABLES.quickLinks, payload)
        : [];
    const payloadIds = new Set(payload.map((item) => item.id));
    const deleteIds = existingRows
        .map((row) => row.id)
        .filter((id) => !payloadIds.has(id));
    await deleteSupabaseAdminRows(SUPABASE_TABLES.quickLinks, deleteIds);
    const persistedById = new Map(mapQuickLinks(persistedRows).map((item) => [item.id, item]));
    return payload.map((item) => persistedById.get(item.id) || mapQuickLinks([item])[0]);
}
