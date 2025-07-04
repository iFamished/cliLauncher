import path from 'path';
import fs from 'fs';
import { ClientJar } from '../../../types/client';
import { Metadata } from '../../../types/launcher';

export interface InstallerProvider {
    metadata: Metadata;
    get(): Promise<ClientJar | null>;
}

export class InstallerRegistry {
    private providers: Map<string, InstallerProvider> = new Map();

    constructor() {
        this.registerBuiltins();
        this.registerModLoaders();
    }

    private registerBuiltins() {
        const vanilla = require('./vanilla').default as InstallerProvider;
        this.register(vanilla);
    }

    private registerModLoaders() {
        const dir = path.join(__dirname, 'mod_loaders');

        if (!fs.existsSync(dir)) return;

        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

            const loader = require(path.join(dir, file)).default as InstallerProvider;

            if (loader?.metadata?.name) {
                this.register(loader);
            }
        }
    }

    public register(provider: InstallerProvider) {
        const key = provider.metadata.name.toLowerCase();
        this.providers.set(key, provider);
    }

    public get(name: string): InstallerProvider | undefined {
        return this.providers.get(name.toLowerCase());
    }

    public list(): string[] {
        return Array.from(this.providers.keys());
    }

    public all(): InstallerProvider[] {
        return Array.from(this.providers.values());
    }
}
