import type { AUTH_PROVIDERS, AuthProviderConstructor, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
export declare const providers: Record<string, () => Promise<{
    default: AuthProviderConstructor;
}>>;
export declare function getAuthProviders(): Promise<Map<string, AuthProviderConstructor>>;
export declare function getAuthProvider(account: LauncherAccount | AUTH_PROVIDERS): Promise<IAuthProvider | null>;
