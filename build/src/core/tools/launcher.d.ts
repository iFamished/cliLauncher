import { LauncherProfile, Metadata } from '../../types/launcher';
export declare class LauncherProfileManager {
    private filePath;
    private data;
    constructor(filePath?: string);
    private load;
    private save;
    addProfile(id: string, versionId: string, version_path: string, metadata: Metadata, name?: string, icon?: string): void;
    deleteProfile(id: string): void;
    selectProfile(id: string): void;
    chooseProfile(): Promise<LauncherProfile | null>;
    listProfiles(): string[];
    getProfile(id: string): LauncherProfile | undefined;
    getSelectedProfile(): LauncherProfile | undefined;
}
export default LauncherProfileManager;
