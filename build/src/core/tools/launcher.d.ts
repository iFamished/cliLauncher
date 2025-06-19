import { LauncherProfile } from '../../types/launcher';
export declare class LauncherProfileManager {
    private filePath;
    private data;
    constructor(filePath?: string);
    private load;
    private save;
    addProfile(id: string, versionId: string, name?: string, icon?: string): void;
    deleteProfile(id: string): void;
    selectProfile(id: string): void;
    listProfiles(): string[];
    getProfile(id: string): LauncherProfile | undefined;
    getSelectedProfile(): string | undefined;
}
export default LauncherProfileManager;
