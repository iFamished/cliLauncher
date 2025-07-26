import axios from "axios";
import { Logger } from "../../../tools/logger";
import { FacetOptions, ModrinthCategory, ModrinthLoader, ModrinthProject, ModrinthSearchParams, ModrinthSearchResponse, ModrinthVersion } from "../../../../types/modrinth";
import { ORIGAMi_USER_AGENT } from "../../../../config/defaults";
import { fetchMinecraftVersionManifest } from "../../../utils/minecraft_versions";

export class RequestQueue {
    private queue: (() => void)[] = [];
    private isProcessing = false;

    constructor(
        private readonly delay = 250,
        private readonly concurrency = 2
    ) {}

    private async sleep(ms: number): Promise<void> {
        return new Promise(res => setTimeout(res, ms));
    }

    public async enqueue<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });

            if (!this.isProcessing) this.processQueue();
        });
    }

    private async processQueue() {
        this.isProcessing = true;
        const running: Promise<void>[] = [];

        while (this.queue.length > 0) {
            while (running.length < this.concurrency && this.queue.length > 0) {
                const task = this.queue.shift();
                if (!task) break;

                const runner = (async () => {
                    await task();
                    await this.sleep(this.delay);
                })();

                running.push(runner);

                runner.finally(() => {
                    const index = running.indexOf(runner);
                    if (index !== -1) running.splice(index, 1);
                });
            }

            await Promise.race(running);
        }

        await Promise.allSettled(running);
        this.isProcessing = false;
    }
}

export class ModrinthTags {
    private logger: Logger;
    private queue = new RequestQueue(300, 3);

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public async api<T = any>(endpoint: string, query?: Record<string, string>): Promise<T | null> {
        return this.queue.enqueue(async () => {
            try {
                const url = new URL(`https://api.modrinth.com/v2/${endpoint}`);

                if (query) {
                    for (const [key, value] of Object.entries(query)) {
                        url.searchParams.append(key, value);
                    }
                }

                const response = await axios.get<T>(url.toString(), {
                    headers: {
                        'User-Agent': ORIGAMi_USER_AGENT
                    }
                });

                return response.data;
            } catch (err: any) {
                this.logger.error(`❌ Modrinth API error (${endpoint}):`, JSON.stringify(err.response?.data) || err.message);
                return null;
            }
        });
    }

    public getLoaders(): Promise<ModrinthLoader[] | null> {
        return this.api('tag/loader');
    }

    public async getCategories(project_type?: string): Promise<ModrinthCategory[] | null> {
        let result = await this.api('tag/category');

        if(project_type && result) {
            result = result.filter((v: ModrinthCategory) => v.project_type == (project_type.trim().toLowerCase()));
        } 

        return result;
    }

    public async getProjectTypes(loader_name?: string): Promise<string[] | null> {
        let loaders = await this.getLoaders();
        let results = await this.api('tag/project_type');
        
        if(loader_name && loaders) {
            let loader = loaders.find(v => v.name === loader_name.toLowerCase());
            if(loader) {
                return loader.supported_project_types;
            } else return null;
        } else return results;
    }
}

export class ModrinthVersions {
    public tags: ModrinthTags;

    constructor(logger: Logger) {
        this.tags = new ModrinthTags(logger);
    }

    public fetchVersions(id: string, loaders?: string[], versions?: string[], featured?: boolean): Promise<ModrinthVersion[] | null> {
        let query: Record<string, string> = {};

        if(loaders) query['loaders'] = JSON.stringify(loaders);
        if(versions) query['game_versions'] = JSON.stringify(versions);

        if(typeof featured === 'boolean') query['featured'] = `${featured}`;
        
        return this.tags.api(`project/${id}/version`, query);
    }

    public getVersion(id: string): Promise<ModrinthVersion | null> {
        return this.tags.api(`version/${id}`);
    }
}

export class ModrinthProjects {
    public tags: ModrinthTags;
    public versions: ModrinthVersions;

    constructor(logger: Logger) {
        this.versions = new ModrinthVersions(logger);
        this.tags = this.versions.tags;
    }

    public async fetchAllMatchVersions(id: string): Promise<string[]> {
        const manifest = await fetchMinecraftVersionManifest();
        const targetPrefix = id.split('.').slice(0, 2).join('.');

        return manifest.versions
            .map(v => v.id)
            .filter(v => v.startsWith(targetPrefix));
    }

    private generateModrinthFacets(options: FacetOptions): string[][] {
        const facets: string[][] = [];

        if (options.loaders?.length)
            facets.push(options.loaders.map(c => `categories:${c}`));

        if (options.categories?.length)
            facets.push(options.categories.map(c => `categories:${c}`));

        if (options.versions?.length)
            facets.push(options.versions.map(v => `versions:${v}`));

        if (options.project_type)
            facets.push([`project_type:${options.project_type}`]);

        if (options.client_side?.length)
            facets.push(options.client_side.map(c => `client_side:${c}`));

        if (options.server_side?.length)
            facets.push(options.server_side.map(s => `server_side:${s}`));

        return facets;
    }

    public searchProject(search: ModrinthSearchParams): Promise<ModrinthSearchResponse | null> {
        return this.tags.api('search', {
            query: search.query || '*',
            facets: JSON.stringify(this.generateModrinthFacets(search.facets || {})),
            index: search.index || 'relevance',
            offset: `${search.offset || 0}`,
            limit: `${search.limit || 20}`,
        });
    }

    public getProject(id: string): Promise<ModrinthProject | null> {
        return this.tags.api(`project/${id}`);
    }

}