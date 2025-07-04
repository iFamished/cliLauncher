import { Logger } from "../../../tools/logger";
import { ModrinthCategory, ModrinthLoader, ModrinthProject, ModrinthSearchParams, ModrinthSearchResponse, ModrinthVersion } from "../../../../types/modrinth";
export declare class ModrinthTags {
    private logger;
    constructor(logger: Logger);
    api<T = any>(endpoint: string, query?: Record<string, string>): Promise<T | null>;
    getLoaders(): Promise<ModrinthLoader[] | null>;
    getCategories(project_type?: string): Promise<ModrinthCategory[] | null>;
    getProjectTypes(loader_name?: string): Promise<string[] | null>;
}
export declare class ModrinthVersions {
    tags: ModrinthTags;
    constructor(logger: Logger);
    fetchVersions(id: string, loaders?: string[], versions?: string[], featured?: boolean): Promise<ModrinthVersion[] | null>;
    getVersion(id: string): Promise<ModrinthVersion | null>;
}
export declare class ModrinthProjects {
    tags: ModrinthTags;
    versions: ModrinthVersions;
    constructor(logger: Logger);
    fetchAllMatchVersions(id: string): Promise<string[]>;
    private generateModrinthFacets;
    searchProject(search: ModrinthSearchParams): Promise<ModrinthSearchResponse | null>;
    getProject(id: string): Promise<ModrinthProject | null>;
}
