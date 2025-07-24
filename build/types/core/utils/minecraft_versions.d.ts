import { VersionData, VersionManifest } from "../../types/version";
export declare function fetchMinecraftVersionManifest(): Promise<VersionManifest>;
export declare function fetchMinecraftVersions(): Promise<string[]>;
export declare function askForVersion(mcVersions: VersionData[], latestMC: string): Promise<string>;
export declare function getRequiredJavaMajor(versionId: string): Promise<number | null>;
export declare function isJavaCompatible(installed: string | null, versionId: string): Promise<{
    result: boolean;
    installed: number | null;
    required: number | null;
}>;
