export interface GitHubAsset {
    name: string;
    browser_download_url: string;
    content_type: string;
}

export interface GitHubRelease {
    assets: GitHubAsset[];
    tag_name: string;
}