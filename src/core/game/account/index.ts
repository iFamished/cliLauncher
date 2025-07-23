import path from "path";
import fs from "fs-extra";
import type { AuthProviderConstructor, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
import { logger } from "../launch/handler";
import { Separator } from "@inquirer/prompts";

const authRegistry = new Map<string, () => Promise<{ default: AuthProviderConstructor }>>();
const loadedTimestamps = new Map<string, number>();

export function registerAuthProvider(
    name: string,
    loader: () => Promise<{ default: AuthProviderConstructor }>
) {
    authRegistry.set(name, loader);
}

async function loadAllAuthProviders() {
    const root = path.join(__dirname, "auth_types");
    const folders = ["premade", "usermade"];

    for (const folder of folders) {
        const dir = path.join(root, folder);
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stats = fs.statSync(fullPath);
            const lastModified = stats.mtimeMs;

            if (loadedTimestamps.get(fullPath) === lastModified) continue;

            const name = path.basename(file, path.extname(file));

            try {
                let providerCtor: AuthProviderConstructor = (await import(fullPath)).default;
                if(!providerCtor) throw new Error('invalid provider');

                let metadata = new providerCtor('', '').metadata;
            
                registerAuthProvider(metadata.name, async () => await import(fullPath));
                loadedTimestamps.set(fullPath, lastModified);
            } catch (err) {
                logger.warn(`⚠️ Failed to register auth provider '${name}': ${(err as Error).message}`);
            }
        }
    }
}

export async function getAuthProviders(): Promise<Map<string, AuthProviderConstructor>> {
    await loadAllAuthProviders();

    const map = new Map<string, AuthProviderConstructor>();

    for (const [key, loader] of authRegistry.entries()) {
        const module = await loader();
        map.set(key, module.default);
    }

    return map;
}

export async function getAuthProvider(account: LauncherAccount | string): Promise<IAuthProvider | null> {
    try {
        const providers = await getAuthProviders();

        if (typeof account === "string") {
            const AuthClass = providers.get(account);
            if (!AuthClass) {
                logger.error(`🔍 AuthProvider '${account}' not found in registry.`);
                return null;
            }
            return new AuthClass("", "") as IAuthProvider;
        }

        const AuthClass = providers.get(account.auth.name);
        if (!AuthClass) {
            logger.log(`AuthProvider: '${account.auth.name}' not found`);
            return null;
        }

        let auth_provider = new AuthClass(account.credentials.email, account.credentials.password);
        await auth_provider.set_current(account);

        return auth_provider;
    } catch (err) {
        logger.error('Failed to get auth provider:', (err as Error).message);
        return null;
    }
}