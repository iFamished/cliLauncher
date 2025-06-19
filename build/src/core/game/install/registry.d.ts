import { ClientJar } from '../../../types/client';
export interface InstallerProvider {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get(): Promise<ClientJar | null>;
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
