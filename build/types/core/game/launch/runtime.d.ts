import { Handler } from './handler';
import { LauncherProfile } from '../../../types/launcher';
export declare class Runtime {
    handler: Handler;
    version: string;
    constructor();
    start(): Promise<void>;
    private showLicenseAgreement;
    private getVersion;
    private getAllLicense;
    private getLicense;
    private hasAgreedToLicense;
    private showHeader;
    private authenticatorMenu;
    private mainMenu;
    resetMinecraft(): Promise<void>;
    resetOrigami(): Promise<void>;
    private launch;
    private exit;
    manageInstallationsMenu(profile: LauncherProfile): Promise<void>;
    private manageInstalledItem;
}
