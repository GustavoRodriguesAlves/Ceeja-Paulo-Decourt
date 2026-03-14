export interface SupabasePublicConfig {
  projectUrl: string;
  publishableKey: string;
  storageBucket: string;
  enabled: boolean;
}

export const SUPABASE_CONFIG: SupabasePublicConfig = {
  projectUrl: "",
  publishableKey: "",
  storageBucket: "portal-media",
  enabled: false
};

export function isSupabaseConfigReady(): boolean {
  return (
    SUPABASE_CONFIG.enabled &&
    SUPABASE_CONFIG.projectUrl.trim().length > 0 &&
    SUPABASE_CONFIG.publishableKey.trim().length > 0
  );
}
