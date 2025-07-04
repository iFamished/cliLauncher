import axios from "axios";
import { Logger } from "../../../tools/logger";
import { ModrinthCategory, ModrinthLoader } from "../../../../types/modrinth";
import { ORIGAMi_USER_AGENT } from "../../../../config/defaults";

export class ModrinthTags {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    private async api<T = any>(endpoint: string, query?: Record<string, any>): Promise<T | null> {
        try {
            const url = new URL(`https://api.modrinth.com/v2/${endpoint}`);

            if (query) {
                for (const [key, value] of Object.entries(query)) {
                    url.searchParams.append(key, String(value));
                }
            }

            const response = await axios.get<T>(url.toString(), {
                headers: {
                    'User-Agent': ORIGAMi_USER_AGENT
                }
            });

            return response.data;
        } catch (err: any) {
            this.logger.error(`❌ Modrinth API error (${endpoint}):`, err.response?.data || err.message);
            return null;
        }
    }

    public getLoaders(): Promise<ModrinthLoader[] | null> {
        return this.api('tag/loader');
    }

    public getCategories(): Promise<ModrinthCategory[] | null> {
        return this.api('tag/category');
    }

    public getProjectTypes(): Promise<string[] | null> {
        return this.api('/tag/project_type');
    }


}

let mod = new ModrinthTags(new Logger());

async function l () {
    console.log(await mod.getProjectTypes());
};l()