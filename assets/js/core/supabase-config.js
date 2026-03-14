export const SUPABASE_CONFIG = {
    projectUrl: "",
    publishableKey: "",
    storageBucket: "portal-media",
    enabled: false
};
export function isSupabaseConfigReady() {
    return (SUPABASE_CONFIG.enabled &&
        SUPABASE_CONFIG.projectUrl.trim().length > 0 &&
        SUPABASE_CONFIG.publishableKey.trim().length > 0);
}
