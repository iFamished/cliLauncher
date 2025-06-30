import type { AUTH_PROVIDERS, AuthProviderConstructor, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
import { logger } from "../launch/handler";

export const providers: Record<string, () => Promise<{ default: AuthProviderConstructor }>> = {
    ely_by: () => import('./auth_types/ely_by'),
    littleskin: () => import('./auth_types/littleskin'),
    meowskin: () => import('./auth_types/meowskin'),
    microsoft: () => import('./auth_types/microsoft'),
};

export async function getAuthProviders(): Promise<Map<string, AuthProviderConstructor>> {
    const map = new Map<AUTH_PROVIDERS, AuthProviderConstructor>();

    for (const [key, loader] of Object.entries(providers)) {
        const module = await loader();
        map.set(key as AUTH_PROVIDERS, module.default);
    }

    return map;
}

export async function getAuthProvider(account: LauncherAccount | AUTH_PROVIDERS): Promise<IAuthProvider | null> {
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

        const AuthClass = providers.get(account.auth);

        if (!AuthClass) {
            logger.log(`AuthProvider: '${account.auth}' not found`);
            return null;
        }

        let auth_provider = new AuthClass(account.credentials.email, account.credentials.password);
        await auth_provider.set_current(account);

        return auth_provider;
    } catch(_) {
        return null
    }
}