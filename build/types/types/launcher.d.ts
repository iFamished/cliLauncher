import { MclcUser } from "msmc/types/types";
import { Credentials } from "./account";
import { Options } from "./launcher_options";
export interface LauncherProfile {
    name: string;
    type: string;
    created: string;
    lastUsed: string;
    lastVersionId: string;
    icon?: string;
    origami: {
        metadata: Metadata;
        version: string;
        path: string;
    };
}
export interface Metadata {
    name: string;
    author: string;
    description: string;
    unstable?: boolean;
    jvm?: string;
}
export interface LauncherAccount {
    id: string;
    auth: string;
    minecraft?: any;
    validation: boolean;
    access_token: string;
    client_token?: string;
    uuid: string;
    name?: string;
    meta?: {
        refresh?: string | undefined;
        exp?: number;
        type: "mojang" | "msa" | "legacy";
        xuid?: string;
        demo?: boolean;
        rawToken?: MclcUser;
    };
    credentials: Credentials;
    user_properties?: Partial<any> | string;
}
export interface LauncherProfiles {
    origami_profiles: Record<string, LauncherProfile>;
    selectedProfile?: string;
}
export interface LauncherAccounts {
    accounts: Record<string, LauncherAccount>;
    selectedAccount?: string;
}
export interface LauncherAccounts {
    accounts: Record<string, LauncherAccount>;
    selectedAccount?: string;
}
export interface LauncherOptions {
    options: Options;
}
