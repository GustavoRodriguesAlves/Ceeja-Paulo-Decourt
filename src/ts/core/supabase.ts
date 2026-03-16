import type {
  GalleryItem,
  NoticeItem,
  QuickLinkItem,
  SiteContent
} from "../../../assets/js/types/core";
import { normalizeSiteContent } from "./site-content.js";
import { PORTAL_IMAGE_UPLOAD_DIR } from "./site-content.js";
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

type SupabaseAdminAllowlistRow = {
  id: string;
  email: string;
  role: "owner" | "editor";
  active: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseAdminAllowlistUpsertRow = Pick<
  SupabaseAdminAllowlistRow,
  "id" | "email" | "role" | "active"
>;

export interface PanelAccessEntry {
  id: string;
  email: string;
  role: "owner" | "editor";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagePanelUserPayload {
  id?: string;
  email: string;
  password?: string;
  role: "owner" | "editor";
  active: boolean;
}

type SupabaseStorageListItem = {
  name: string;
};

export const SUPABASE_TABLES = {
  notices: "notices",
  quickLinks: "quick_links",
  gallery: "gallery_items",
  adminAllowlist: "admin_allowlist"
} as const;

export interface SupabaseAdminSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

const SUPABASE_ADMIN_SESSION_KEY = "ceeja_supabase_admin_session";
const SUPABASE_ADMIN_REMEMBER_KEY = "ceeja_supabase_admin_session_remembered";

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

export function resolvePublicImageUrl(path: string): string {
  if (!path) {
    return "";
  }

  if (/^(?:https?:)?\/\//i.test(path)) {
    return path;
  }

  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  const bucket = encodeURIComponent(SUPABASE_CONFIG.storageBucket);
  const encodedPath = encodeStoragePath(path);
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function extractSupabaseStoragePath(path: string): string {
  if (!path) {
    return "";
  }

  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  const bucket = encodeURIComponent(SUPABASE_CONFIG.storageBucket);
  const marker = `${baseUrl}/storage/v1/object/public/${bucket}/`;

  if (path.startsWith(marker)) {
    return decodeURIComponent(path.slice(marker.length));
  }

  return path;
}

function buildRestUrl(table: string, query: URLSearchParams): string {
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  return `${baseUrl}/rest/v1/${table}?${query.toString()}`;
}

function buildAuthUrl(path: string): string {
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  return `${baseUrl}/auth/v1/${path}`;
}

function buildFunctionUrl(name: string): string {
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  return `${baseUrl}/functions/v1/${name}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readStoredSession(raw: string | null): SupabaseAdminSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SupabaseAdminSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.email !== "string"
    ) {
      return null;
    }

    return parsed as SupabaseAdminSession;
  } catch {
    return null;
  }
}

function saveSupabaseAdminSession(session: SupabaseAdminSession, remember: boolean): void {
  const serialized = JSON.stringify(session);
  sessionStorage.setItem(SUPABASE_ADMIN_SESSION_KEY, serialized);

  if (remember) {
    localStorage.setItem(SUPABASE_ADMIN_REMEMBER_KEY, serialized);
  } else {
    localStorage.removeItem(SUPABASE_ADMIN_REMEMBER_KEY);
  }
}

export function getSupabaseAdminSession(): SupabaseAdminSession | null {
  return readStoredSession(sessionStorage.getItem(SUPABASE_ADMIN_SESSION_KEY));
}

export function getRememberedSupabaseAdminSession(): SupabaseAdminSession | null {
  return readStoredSession(localStorage.getItem(SUPABASE_ADMIN_REMEMBER_KEY));
}

export function syncRememberedSupabaseAdminSession(): SupabaseAdminSession | null {
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

export function clearSupabaseAdminSession(): void {
  sessionStorage.removeItem(SUPABASE_ADMIN_SESSION_KEY);
  localStorage.removeItem(SUPABASE_ADMIN_REMEMBER_KEY);
}

function normalizeAuthSessionResponse(payload: Record<string, unknown>): SupabaseAdminSession {
  const accessToken = String(payload.access_token || "");
  const refreshToken = String(payload.refresh_token || "");
  const expiresAt =
    typeof payload.expires_at === "number"
      ? payload.expires_at
      : Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600);
  const user = payload.user as { email?: string } | undefined;
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

export async function signInSupabaseAdmin(
  email: string,
  password: string,
  remember = false
): Promise<SupabaseAdminSession> {
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

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.msg || payload.error_description || payload.error || "Falha ao autenticar no Supabase."));
  }

  const session = normalizeAuthSessionResponse(payload);
  saveSupabaseAdminSession(session, remember);
  return session;
}

async function refreshSupabaseAdminSession(): Promise<SupabaseAdminSession> {
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

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    clearSupabaseAdminSession();
    throw new Error(String(payload.msg || payload.error_description || payload.error || "Falha ao renovar sessão do Supabase."));
  }

  const refreshed = normalizeAuthSessionResponse(payload);
  saveSupabaseAdminSession(
    refreshed,
    Boolean(localStorage.getItem(SUPABASE_ADMIN_REMEMBER_KEY))
  );
  return refreshed;
}

export async function getSupabaseAdminAccessToken(): Promise<string> {
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

async function fetchSupabaseAdminRows<T>(table: string, query: URLSearchParams): Promise<T[]> {
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

  return (await response.json()) as T[];
}

async function upsertSupabaseAdminRows<T extends Record<string, unknown>>(
  table: string,
  rows: T[]
): Promise<T[]> {
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

  return (await response.json()) as T[];
}

async function deleteSupabaseAdminRows(table: string, ids: string[]): Promise<void> {
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ensureSupabaseRecordId(value: string): string {
  return isUuid(value) ? value : crypto.randomUUID();
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

function mapPanelAccess(rows: SupabaseAdminAllowlistRow[]): PanelAccessEntry[] {
  return rows.map((row) => ({
    id: row.id,
    email: normalizeEmail(row.email),
    role: row.role === "owner" ? "owner" : "editor",
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return { ...SUPABASE_CONFIG };
}

export async function fetchSupabaseEditorSiteContent(): Promise<SiteContent> {
  const [noticeRows, quickLinkRows, galleryRows] = await Promise.all([
    fetchSupabaseAdminRows<SupabaseNoticeRow>(
      SUPABASE_TABLES.notices,
      new URLSearchParams({
        select: "id,title,summary,category,date,featured,published",
        order: "featured.desc,date.desc"
      })
    ),
    fetchSupabaseAdminRows<SupabaseQuickLinkRow>(
      SUPABASE_TABLES.quickLinks,
      new URLSearchParams({
        select: "id,label,url,published",
        order: "created_at.desc"
      })
    ),
    fetchSupabaseAdminRows<SupabaseGalleryRow>(
      SUPABASE_TABLES.gallery,
      new URLSearchParams({
        select: "id,title,alt,image_path,sort_order,published",
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

export async function fetchCurrentPanelAccess(): Promise<PanelAccessEntry | null> {
  const session = getSupabaseAdminSession() || syncRememberedSupabaseAdminSession();
  if (!session) {
    return null;
  }

  const rows = await fetchSupabaseAdminRows<SupabaseAdminAllowlistRow>(
    SUPABASE_TABLES.adminAllowlist,
    new URLSearchParams({
      select: "id,email,role,active,created_at,updated_at",
      email: `eq.${normalizeEmail(session.email)}`,
      active: "eq.true",
      limit: "1"
    })
  );

  return mapPanelAccess(rows)[0] || null;
}

export async function ensureSupabasePanelAccess(): Promise<PanelAccessEntry> {
  const access = await fetchCurrentPanelAccess();
  if (!access) {
    clearSupabaseAdminSession();
    throw new Error("Este e-mail não está autorizado a entrar no painel.");
  }

  return access;
}

export async function fetchPanelAllowlist(): Promise<PanelAccessEntry[]> {
  const rows = await fetchSupabaseAdminRows<SupabaseAdminAllowlistRow>(
    SUPABASE_TABLES.adminAllowlist,
    new URLSearchParams({
      select: "id,email,role,active,created_at,updated_at",
      order: "role.asc,created_at.asc"
    })
  );

  return mapPanelAccess(rows).sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }

    return left.email.localeCompare(right.email);
  });
}

export async function syncPanelAllowlist(entries: PanelAccessEntry[]): Promise<PanelAccessEntry[]> {
  const existingRows = await fetchSupabaseAdminRows<Pick<SupabaseAdminAllowlistRow, "id">>(
    SUPABASE_TABLES.adminAllowlist,
    new URLSearchParams({
      select: "id"
    })
  );

  const payload: SupabaseAdminAllowlistUpsertRow[] = entries.map((entry) => ({
    id: ensureSupabaseRecordId(entry.id),
    email: normalizeEmail(entry.email),
    role: entry.role === "owner" ? "owner" : "editor",
    active: entry.active
  }));

  const persistedRows = payload.length
    ? (await upsertSupabaseAdminRows<SupabaseAdminAllowlistUpsertRow>(
        SUPABASE_TABLES.adminAllowlist,
        payload
      )) as SupabaseAdminAllowlistRow[]
    : [];

  const payloadIds = new Set(payload.map((item) => item.id));
  const deleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !payloadIds.has(id));

  await deleteSupabaseAdminRows(SUPABASE_TABLES.adminAllowlist, deleteIds);
  const persistedById = new Map(mapPanelAccess(persistedRows).map((item) => [item.id, item]));
  return payload.map((item) => {
    const persisted = persistedById.get(item.id);
    return (
      persisted || {
        id: item.id,
        email: item.email,
        role: item.role === "owner" ? "owner" : "editor",
        active: item.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  });
}

export async function manageSupabasePanelUser(
  payload: ManagePanelUserPayload
): Promise<PanelAccessEntry> {
  const accessToken = await getSupabaseAdminAccessToken();
  const response = await fetch(buildFunctionUrl("manage-panel-users"), {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: payload.id || null,
      email: normalizeEmail(payload.email),
      password: payload.password || null,
      role: payload.role === "owner" ? "owner" : "editor",
      active: payload.active
    })
  });

  const rawText = await response.text();
  const responseBody = rawText ? (JSON.parse(rawText) as { error?: string; entry?: PanelAccessEntry }) : {};

  if (!response.ok || !responseBody.entry) {
    throw new Error(responseBody.error || `Falha ao executar a função do Supabase (${response.status}).`);
  }

  return responseBody.entry;
}

export async function syncSupabaseNotices(notices: NoticeItem[]): Promise<NoticeItem[]> {
  const existingRows = await fetchSupabaseAdminRows<Pick<SupabaseNoticeRow, "id">>(
    SUPABASE_TABLES.notices,
    new URLSearchParams({
      select: "id"
    })
  );

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
    ? await upsertSupabaseAdminRows<SupabaseNoticeRow>(SUPABASE_TABLES.notices, payload)
    : [];

  const payloadIds = new Set(payload.map((item) => item.id));
  const deleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !payloadIds.has(id));

  await deleteSupabaseAdminRows(SUPABASE_TABLES.notices, deleteIds);
  const persistedById = new Map(mapNotices(persistedRows).map((item) => [item.id, item]));
  return payload.map((item) => persistedById.get(item.id) || mapNotices([item])[0]);
}

export async function syncSupabaseQuickLinks(links: QuickLinkItem[]): Promise<QuickLinkItem[]> {
  const existingRows = await fetchSupabaseAdminRows<Pick<SupabaseQuickLinkRow, "id">>(
    SUPABASE_TABLES.quickLinks,
    new URLSearchParams({
      select: "id"
    })
  );

  const payload = links.map((link) => ({
    id: ensureSupabaseRecordId(link.id),
    label: link.label,
    url: link.url,
    published: link.published
  }));

  const persistedRows = payload.length
    ? await upsertSupabaseAdminRows<SupabaseQuickLinkRow>(SUPABASE_TABLES.quickLinks, payload)
    : [];

  const payloadIds = new Set(payload.map((item) => item.id));
  const deleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !payloadIds.has(id));

  await deleteSupabaseAdminRows(SUPABASE_TABLES.quickLinks, deleteIds);
  const persistedById = new Map(mapQuickLinks(persistedRows).map((item) => [item.id, item]));
  return payload.map((item) => persistedById.get(item.id) || mapQuickLinks([item])[0]);
}

export async function syncSupabaseGallery(gallery: GalleryItem[]): Promise<GalleryItem[]> {
  const existingRows = await fetchSupabaseAdminRows<Pick<SupabaseGalleryRow, "id">>(
    SUPABASE_TABLES.gallery,
    new URLSearchParams({
      select: "id"
    })
  );

  const payload = gallery.map((item) => ({
    id: ensureSupabaseRecordId(item.id),
    title: item.title,
    alt: item.alt,
    image_path: extractSupabaseStoragePath(item.src),
    sort_order: Number(item.order || 0),
    published: item.published
  }));

  const persistedRows = payload.length
    ? await upsertSupabaseAdminRows<SupabaseGalleryRow>(SUPABASE_TABLES.gallery, payload)
    : [];

  const payloadIds = new Set(payload.map((item) => item.id));
  const deleteIds = existingRows
    .map((row) => row.id)
    .filter((id) => !payloadIds.has(id));

  await deleteSupabaseAdminRows(SUPABASE_TABLES.gallery, deleteIds);
  const persistedById = new Map(mapGallery(persistedRows).map((item) => [item.id, item]));
  return payload.map((item) => {
    const persisted = persistedById.get(item.id);
    return (
      persisted || {
        id: item.id,
        title: item.title,
        src: resolvePublicImageUrl(item.image_path),
        alt: item.alt,
        order: item.sort_order,
        published: item.published
      }
    );
  });
}

export async function uploadPortalImageToSupabase(
  file: File,
  path: string
): Promise<{ path: string; publicUrl: string }> {
  const accessToken = await getSupabaseAdminAccessToken();
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  const bucket = encodeURIComponent(SUPABASE_CONFIG.storageBucket);
  const normalizedPath = path.replace(/^\/+/, "");
  const encodedPath = encodeStoragePath(normalizedPath);

  const response = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true"
    },
    body: file
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${response.status}: ${details}`);
  }

  return {
    path: normalizedPath,
    publicUrl: resolvePublicImageUrl(normalizedPath)
  };
}

export async function listSupabasePortalImageLibrary(): Promise<Array<{
  path: string;
  name: string;
  previewSrc: string;
  source: "repository";
}>> {
  const accessToken = await getSupabaseAdminAccessToken();
  const baseUrl = trimTrailingSlash(SUPABASE_CONFIG.projectUrl);
  const bucket = encodeURIComponent(SUPABASE_CONFIG.storageBucket);

  const response = await fetch(`${baseUrl}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prefix: PORTAL_IMAGE_UPLOAD_DIR,
      limit: 200,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc"
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase ${response.status}: ${details}`);
  }

  const items = (await response.json()) as SupabaseStorageListItem[];
  return items
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => {
      const fullPath = `${PORTAL_IMAGE_UPLOAD_DIR}/${item.name}`.replace(/\/+/g, "/");
      return {
        path: fullPath,
        name: item.name.split("/").pop() || item.name,
        previewSrc: resolvePublicImageUrl(fullPath),
        source: "repository" as const
      };
    });
}
