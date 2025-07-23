import type { AuthProviderConstructor, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
export declare const authRegistry: Map<string, () => Promise<{
    default: AuthProviderConstructor;
}>>;
export declare function registerAuthProvider(name: string, loader: () => Promise<{
    default: AuthProviderConstructor;
}>): void;
export declare function loadAllAuthProviders(): Promise<void>;
export declare function getAuthProviders(): Promise<Map<string, AuthProviderConstructor>>;
export declare function getAuthProvider(account: LauncherAccount | string): Promise<IAuthProvider | null>;
