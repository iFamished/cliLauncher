import { Logger } from '../../../tools/logger';
import { LauncherProfile } from '../../../../types/launcher';
export declare class ModInstaller {
    private logger;
    private modrinth;
    private pageSize;
    constructor(logger: Logger);
    install_modrinth_content(profile: LauncherProfile): Promise<void>;
    private handleProjectInstall;
}
