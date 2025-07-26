"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModrinthProjects = exports.ModrinthVersions = exports.ModrinthTags = exports.RequestQueue = void 0;
const axios_1 = __importDefault(require("axios"));
const defaults_1 = require("../../../../config/defaults");
const minecraft_versions_1 = require("../../../utils/minecraft_versions");
class RequestQueue {
    delay;
    concurrency;
    queue = [];
    isProcessing = false;
    constructor(delay = 250, concurrency = 2) {
        this.delay = delay;
        this.concurrency = concurrency;
    }
    async sleep(ms) {
        return new Promise(res => setTimeout(res, ms));
    }
    async enqueue(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
            });
            if (!this.isProcessing)
                this.processQueue();
        });
    }
    async processQueue() {
        this.isProcessing = true;
        const running = [];
        while (this.queue.length > 0) {
            while (running.length < this.concurrency && this.queue.length > 0) {
                const task = this.queue.shift();
                if (!task)
                    break;
                const runner = (async () => {
                    await task();
                    await this.sleep(this.delay);
                })();
                running.push(runner);
                runner.finally(() => {
                    const index = running.indexOf(runner);
                    if (index !== -1)
                        running.splice(index, 1);
                });
            }
            await Promise.race(running);
        }
        await Promise.allSettled(running);
        this.isProcessing = false;
    }
}
exports.RequestQueue = RequestQueue;
class ModrinthTags {
    logger;
    queue = new RequestQueue(300, 3);
    constructor(logger) {
        this.logger = logger;
    }
    async api(endpoint, query) {
        return this.queue.enqueue(async () => {
            try {
                const url = new URL(`https://api.modrinth.com/v2/${endpoint}`);
                if (query) {
                    for (const [key, value] of Object.entries(query)) {
                        url.searchParams.append(key, value);
                    }
                }
                const response = await axios_1.default.get(url.toString(), {
                    headers: {
                        'User-Agent': defaults_1.ORIGAMi_USER_AGENT
                    }
                });
                return response.data;
            }
            catch (err) {
                this.logger.error(`❌ Modrinth API error (${endpoint}):`, JSON.stringify(err.response?.data) || err.message);
                return null;
            }
        });
    }
    getLoaders() {
        return this.api('tag/loader');
    }
    async getCategories(project_type) {
        let result = await this.api('tag/category');
        if (project_type && result) {
            result = result.filter((v) => v.project_type == (project_type.trim().toLowerCase()));
        }
        return result;
    }
    async getProjectTypes(loader_name) {
        let loaders = await this.getLoaders();
        let results = await this.api('tag/project_type');
        if (loader_name && loaders) {
            let loader = loaders.find(v => v.name === loader_name.toLowerCase());
            if (loader) {
                return loader.supported_project_types;
            }
            else
                return null;
        }
        else
            return results;
    }
}
exports.ModrinthTags = ModrinthTags;
class ModrinthVersions {
    tags;
    constructor(logger) {
        this.tags = new ModrinthTags(logger);
    }
    fetchVersions(id, loaders, versions, featured) {
        let query = {};
        if (loaders)
            query['loaders'] = JSON.stringify(loaders);
        if (versions)
            query['game_versions'] = JSON.stringify(versions);
        if (typeof featured === 'boolean')
            query['featured'] = `${featured}`;
        return this.tags.api(`project/${id}/version`, query);
    }
    getVersion(id) {
        return this.tags.api(`version/${id}`);
    }
}
exports.ModrinthVersions = ModrinthVersions;
class ModrinthProjects {
    tags;
    versions;
    constructor(logger) {
        this.versions = new ModrinthVersions(logger);
        this.tags = this.versions.tags;
    }
    async fetchAllMatchVersions(id) {
        const manifest = await (0, minecraft_versions_1.fetchMinecraftVersionManifest)();
        const targetPrefix = id.split('.').slice(0, 2).join('.');
        return manifest.versions
            .map(v => v.id)
            .filter(v => v.startsWith(targetPrefix));
    }
    generateModrinthFacets(options) {
        const facets = [];
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
    searchProject(search) {
        return this.tags.api('search', {
            query: search.query || '*',
            facets: JSON.stringify(this.generateModrinthFacets(search.facets || {})),
            index: search.index || 'relevance',
            offset: `${search.offset || 0}`,
            limit: `${search.limit || 20}`,
        });
    }
    getProject(id) {
        return this.tags.api(`project/${id}`);
    }
}
exports.ModrinthProjects = ModrinthProjects;
//# sourceMappingURL=modrinth.js.map