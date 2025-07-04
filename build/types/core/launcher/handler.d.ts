import MCLCore from ".";
import { ILauncherOptions } from "./types";
export default class Handler {
    client: MCLCore;
    options: ILauncherOptions | null;
    version: any;
    private agent;
    private limit;
    constructor(client: MCLCore);
    checkJava(java: string): Promise<unknown>;
    downloadAsync(url: string, directory: string, name?: string, retry?: boolean, type?: string, maxRetries?: number): Promise<boolean | {
        failed: boolean;
        asset: string | null;
    }>;
    checkSum(hash: string, file: string): Promise<unknown>;
    getVersion(): Promise<unknown>;
    getJar(): Promise<boolean | undefined>;
    getAssets(): Promise<void>;
    parseRule(lib: any): boolean;
    getNatives(): Promise<string | undefined>;
    fwAddArgs(): void;
    isModernForge(json: any): any;
    getForgedWrapped(): Promise<any>;
    downloadToDirectory(directory: string, libraries: any[], eventName: string): Promise<any[]>;
    getClasses(classJson: any): Promise<any[] | undefined>;
    popString(path: string): string;
    cleanUp(array: any): ({} | undefined)[];
    formatQuickPlay(): any[] | null | undefined;
    getLaunchOptions(modification: any): Promise<any[] | undefined>;
    getJVM(): Promise<any>;
    isLegacy(): boolean;
    getOS(): "linux" | "windows" | "osx";
    getMemory(): string[] | undefined;
    extractPackage(options?: ILauncherOptions | null): Promise<boolean | undefined>;
}
