import { LauncherAccount } from "./launcher";

export interface Credentials {
    email: string;
    password: string;
}

export interface IAuthMetadata {
    name: string;
    base: string;
}

export interface IAuthProvider {
    metadata: IAuthMetadata;
    set_current(account: LauncherAccount): Promise<LauncherAccount>;
    set_credentials(email: string, password: string): Credentials;
    authenticate(): Promise<LauncherAccount | null>;
    token(): Promise<LauncherAccount | null>;
    is_token(token: LauncherAccount): boolean;
    auth_lib(): Promise<string>;
}

export interface AuthProviderConstructor {
    new (email: string, password: string): IAuthProvider;
}