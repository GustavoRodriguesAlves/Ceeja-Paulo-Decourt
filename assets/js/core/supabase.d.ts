import type { NoticeItem, QuickLinkItem, SiteContent } from "../../../assets/js/types/core";
import { type SupabasePublicConfig } from "./supabase-config.js";
export interface PanelAccessEntry {
    id: string;
    email: string;
    role: "owner" | "editor";
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare const SUPABASE_TABLES: {
    readonly notices: "notices";
    readonly quickLinks: "quick_links";
    readonly gallery: "gallery_items";
    readonly adminAllowlist: "admin_allowlist";
};
export interface SupabaseAdminSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email: string;
}
export declare function getSupabaseAdminSession(): SupabaseAdminSession | null;
export declare function getRememberedSupabaseAdminSession(): SupabaseAdminSession | null;
export declare function syncRememberedSupabaseAdminSession(): SupabaseAdminSession | null;
export declare function clearSupabaseAdminSession(): void;
export declare function signInSupabaseAdmin(email: string, password: string, remember?: boolean): Promise<SupabaseAdminSession>;
export declare function getSupabaseAdminAccessToken(): Promise<string>;
export declare function getSupabasePublicConfig(): SupabasePublicConfig;
export declare function fetchSupabaseEditorSiteContent(): Promise<SiteContent>;
export declare function fetchSupabasePublishedSiteContent(): Promise<SiteContent>;
export declare function fetchCurrentPanelAccess(): Promise<PanelAccessEntry | null>;
export declare function ensureSupabasePanelAccess(): Promise<PanelAccessEntry>;
export declare function fetchPanelAllowlist(): Promise<PanelAccessEntry[]>;
export declare function syncPanelAllowlist(entries: PanelAccessEntry[]): Promise<PanelAccessEntry[]>;
export declare function syncSupabaseNotices(notices: NoticeItem[]): Promise<NoticeItem[]>;
export declare function syncSupabaseQuickLinks(links: QuickLinkItem[]): Promise<QuickLinkItem[]>;
