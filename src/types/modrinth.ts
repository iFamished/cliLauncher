
export interface ModrinthLoader {
    icon: string;
    name: string;
    supported_project_types: string[];
}

export interface ModrinthCategory {
    icon: string;
    name: string;
    project_type: string;
    header: string;
}

export interface ModrinthVersionFile {
    hashes: Record<string, string>;
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    file_type?: 'required-resource-pack' | 'optional-resource-pack' | null;
}

export interface ModrinthDependency {
    version_id?: string | null;
    project_id: string;
    dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export interface ModrinthVersion {
    id: string;
    project_id: string;
    author_id: string;

    name: string;
    version_number: string;
    changelog?: string | null;
    changelog_url?: string | null;

    dependencies: ModrinthDependency[];

    game_versions: string[];
    version_type: 'release' | 'beta' | 'alpha';
    loaders: string[];

    featured: boolean;
    status: 'listed' | 'archived' | 'draft' | 'unlisted' | 'scheduled' | 'unknown';
    requested_status?: 'listed' | 'archived' | 'draft' | 'unlisted' | null;

    date_published: string;
    downloads: number;

    files: ModrinthVersionFile[];
}

export interface ModrinthProject {
    id: string;
    slug: string;
    title: string;
    description: string;
    body: string;
    body_url: string | null;
    project_type: 'mod' | 'modpack' | 'resourcepack' | 'shader';
    categories: string[];
    additional_categories: string[];
    client_side: 'required' | 'optional' | 'unsupported' | 'unknown';
    server_side: 'required' | 'optional' | 'unsupported' | 'unknown';
    status:
        | 'approved'
        | 'archived'
        | 'rejected'
        | 'draft'
        | 'unlisted'
        | 'processing'
        | 'withheld'
        | 'scheduled'
        | 'private'
        | 'unknown';
    requested_status?:
        | 'approved'
        | 'archived'
        | 'unlisted'
        | 'private'
        | 'draft'
        | null;
    team: string;
    published: string; // ISO-8601
    updated: string;   // ISO-8601
    approved?: string | null;
    queued?: string | null;
    issues_url?: string | null;
    source_url?: string | null;
    wiki_url?: string | null;
    discord_url?: string | null;
    icon_url?: string | null;
    color?: number | null;
    thread_id: string;
    monetization_status: 'monetized' | 'demonetized' | 'force-demonetized';
    downloads: number;
    followers: number;
    license: string;
    versions: string[];
    game_versions: string[];
    loaders: string[];
    gallery: ModrinthGalleryImage[];
    donation_urls: ModrinthDonationLink[];
    moderator_message?: string;
}

export const ModrinthSortOptions = [
  'relevance',
  'downloads',
  'follows',
  'newest',
  'updated'
] as const;

export type ModrinthSortOption = typeof ModrinthSortOptions[number];

export interface ModrinthSearchParams {
    query?: string;
    limit?: number;
    offset?: number;
    index?: ModrinthSortOption;
    facets?: FacetOptions;
}

export interface ModrinthDonationLink {
    id: string;        // e.g. "patreon"
    platform: string;  // e.g. "Patreon"
    url: string;       // e.g. "https://patreon.com/user"
}

export interface ModrinthGalleryImage {
    url: string;
    featured: boolean;
    title: string | null;
    description: string | null;
    created: string; // ISO-8601
    ordering: number;
}

export interface ModrinthSearchResponse {
    hits: ModrinthSearchHit[];
    offset: number;
    limit: number;
    total_hits: number;
}

export interface ModrinthSearchHit {
    slug: string;
    title: string;
    description: string;
    categories: string[];
    display_categories: string[];
    client_side: 'required' | 'optional' | 'unsupported' | 'unknown';
    server_side: 'required' | 'optional' | 'unsupported' | 'unknown';
    project_type: 'mod' | 'modpack' | 'resourcepack' | 'shader';
    downloads: number;
    follows: number;
    icon_url: string | null;
    color: number | null;
    thread_id: string;
    monetization_status: 'monetized' | 'demonetized' | 'force-demonetized';
    project_id: string;
    author: string;
    versions: string[]; // Minecraft versions
    latest_version: string;
    license: string; // SPDX ID, e.g., "MIT"
    gallery: string[]; // URLs
    featured_gallery: string | null;
    date_created: string;  // ISO-8601 format
    date_modified: string; // ISO-8601 format
}

export type FacetOptions = {
    categories?: string[];
    versions?: string[];
    project_type?: string[];
    client_side?: ('required' | 'optional' | 'unsupported')[];
    server_side?: ('required' | 'optional' | 'unsupported')[];
};

export interface InstalledProfile {
    mods: string[];
    shaders: string[];
    resourcepacks: string[];
};

export interface Filters {
    sort?: ModrinthSortOption;
    versionFilter?: string[];
    selectedCategories?: string[];
}

export interface ModProfile {
    version: string;
    filters?: {
        mod?: Filters;
        shader?: Filters;
        resourcepack?: Filters;
    };
    installed: InstalledProfile;
    disabled: string[];
}

export interface ModData {
    hit: string;
    is_installed: ModrinthVersion | undefined;
    specific: ModrinthVersionFile | undefined;
    versions: ModrinthVersion[];
}