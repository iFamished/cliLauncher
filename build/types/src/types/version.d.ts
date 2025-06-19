export interface VersionManifest {
    latest: VersionLatest;
    versions: VersionData[];
}
export interface VersionLatest {
    release: string;
    snapshot: string;
}
export interface VersionData {
    id: string;
    type: string;
    url: string;
    time: string;
    releaseTime: string;
}
export interface ForgeVersions {
    id: string;
    forge: string[];
}
