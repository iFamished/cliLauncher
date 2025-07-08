import { VersionData, VersionManifest } from "../../types/version";
export declare function fetchMinecraftVersionManifest(): Promise<VersionManifest>;
export declare function fetchMinecraftVersions(): Promise<string[]>;
export declare function askForVersion(mcVersions: VersionData[], latestMC: string): Promise<string>;
