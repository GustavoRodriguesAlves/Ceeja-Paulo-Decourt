import type { SiteContent } from "../../../assets/js/types/core";
import { type SupabasePublicConfig } from "./supabase-config.js";
export declare const SUPABASE_TABLES: {
    readonly notices: "notices";
    readonly quickLinks: "quick_links";
    readonly gallery: "gallery_items";
};
export declare function getSupabasePublicConfig(): SupabasePublicConfig;
export declare function fetchSupabasePublishedSiteContent(): Promise<SiteContent>;
