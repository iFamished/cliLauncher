import { Logger } from '../../../tools/logger';
import { LauncherProfile } from '../../../../types/launcher';
import { ModrinthSortOption } from '../../../../types/modrinth';
import ModrinthModManager from './manager';
export declare class ModInstaller {
    private logger;
    private modrinth;
    private pageSize;
    constructor(logger: Logger);
    configure_filters(project_type: string, version: string, loader: string, manager: ModrinthModManager, defaults?: {
        sort?: ModrinthSortOption;
        versionMatch?: 'strict' | 'match' | 'none';
        selectedCategories?: string[];
    }): Promise<{
        sort: ModrinthSortOption;
        versionFilter: string[] | undefined;
        categories: string[] | undefined;
    }>;
    ask_confirmation(message: string, _applyToAll?: boolean, _default?: string | undefined): Promise<{
        choice: 'keep' | 'replace';
        applyToAll: boolean;
    }>;
    install_modrinth_content(profile: LauncherProfile): Promise<void>;
    private handleProjectInstall;
}
