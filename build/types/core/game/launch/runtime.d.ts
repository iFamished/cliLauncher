export declare class Runtime {
    private handler;
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
    private launch;
    private exit;
}
