export interface SupabasePublicConfig {
    projectUrl: string;
    publishableKey: string;
    storageBucket: string;
    enabled: boolean;
}
export declare const SUPABASE_CONFIG: SupabasePublicConfig;
export declare function isSupabaseConfigReady(): boolean;
