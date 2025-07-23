import type { AuthProviderConstructor, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
export declare function registerAuthProvider(name: string, loader: () => Promise<{
    default: AuthProviderConstructor;
}>): void;
export declare function getAuthProviders(): Promise<Map<string, AuthProviderConstructor>>;
export declare function getAuthProvider(account: LauncherAccount | string): Promise<IAuthProvider | null>;
