import { LauncherProfile, Metadata } from '../../types/launcher';
export declare class LauncherProfileManager {
    private filePath;
    private data;
    constructor(filePath?: string);
    fetchMetadata(folder: string, versionJsonPath: string): {
        version: string;
        metadata: Metadata;
    };
    private cleanupProfiles;
    autoImportVanillaProfiles(): void;
    private load;
    private save;
    reset(): void;
    addProfile(id: string, versionId: string, version_path: string, metadata: Metadata, name?: string, icon?: string, donot_auto_add?: boolean): void;
    deleteProfile(id: string): void;
    selectProfile(id: string): void;
    chooseProfile(): Promise<LauncherProfile | null>;
    listProfiles(): string[];
    getProfile(id: string): LauncherProfile | undefined;
    getSelectedProfile(): LauncherProfile | undefined;
}
export default LauncherProfileManager;
