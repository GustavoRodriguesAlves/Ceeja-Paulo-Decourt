export const SUPABASE_CONFIG = {
    projectUrl: "https://rmrmbqxrqatkpmjyvtis.supabase.co",
    publishableKey: "sb_publishable_XxJa4ollf0CCDH5nsZ6SQA_WQsAmbad",
    storageBucket: "portal-media",
    enabled: true
};
export function isSupabaseConfigReady() {
    return (SUPABASE_CONFIG.enabled &&
        SUPABASE_CONFIG.projectUrl.trim().length > 0 &&
        SUPABASE_CONFIG.publishableKey.trim().length > 0);
}
