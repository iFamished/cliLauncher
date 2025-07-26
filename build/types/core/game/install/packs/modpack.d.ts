import { Logger } from '../../../tools/logger';
import { ModrinthSortOption } from '../../../../types/modrinth';
export declare class ModpackInstaller {
    private logger;
    private modrinth;
    private pageSize;
    constructor(logger: Logger);
    configure_filters(project_type: string): Promise<{
        sort: ModrinthSortOption;
        categories: string[] | undefined;
        loader: string | undefined;
        page_limit: number;
    }>;
    ask_confirmation(message: string, _applyToAll?: boolean, _default?: string | undefined): Promise<{
        choice: 'keep' | 'replace';
        applyToAll: boolean;
    }>;
    install_modrinth_content(): Promise<void>;
    private handleModpackInstall;
}
