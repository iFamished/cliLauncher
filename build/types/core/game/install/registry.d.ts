import { ClientJar } from '../../../types/client';
import { Metadata } from '../../../types/launcher';
export interface InstallerProvider {
    metadata: Metadata;
    get(version?: string, modloader_version?: string): Promise<ClientJar | null>;
}
export declare class InstallerRegistry {
    private providers;
    constructor();
    private registerBuiltins;
    private registerModLoaders;
    register(provider: InstallerProvider): void;
    get(name: string): InstallerProvider | undefined;
    list(): string[];
    all(): InstallerProvider[];
}
