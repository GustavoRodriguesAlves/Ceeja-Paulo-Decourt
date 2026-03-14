export interface TestAccount {
  email: string;
  password: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  featured: boolean;
  published: boolean;
}

export interface QuickLinkItem {
  id: string;
  label: string;
  url: string;
  published: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  src: string;
  alt: string;
  order: number;
  published: boolean;
}

export interface SiteContent {
  updatedAt: string;
  notices: NoticeItem[];
  quickLinks: QuickLinkItem[];
  gallery: GalleryItem[];
}

export interface GitHubRateHeaders {
  retryAfter?: string | null;
  rateRemaining?: string | null;
  rateReset?: string | null;
}

export interface GitHubRepositoryEntry {
  type?: string;
  name?: string;
  path: string;
  sha?: string;
  content?: string;
  download_url?: string | null;
}

export interface GitHubContentWriteResponse {
  content?: GitHubRepositoryEntry;
  commit?: {
    sha?: string;
  };
}

export type PortalImageLibrarySource = "repository" | "gallery" | "upload";

export interface PortalImageLibraryEntry {
  path: string;
  name: string;
  previewSrc: string;
  source: PortalImageLibrarySource;
}
