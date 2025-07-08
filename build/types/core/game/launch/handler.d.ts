import { AUTH_PROVIDERS, Credentials } from "../../../types/account";
import { LauncherAccount, LauncherProfile } from "../../../types/launcher";
import LauncherProfileManager from "../../tools/launcher";
import LauncherAccountManager from "../account/account";
import LauncherOptionsManager from "./options";
import { Logger } from "../../tools/logger";
import { InstallerRegistry } from "../install/registry";
export declare const logger: Logger;
export declare const progress: import("../../tools/logger").ProgressReport;
export declare class Handler {
    profiles: LauncherProfileManager;
    accounts: LauncherAccountManager;
    settings: LauncherOptionsManager;
    installers: InstallerRegistry;
    private auth_provider;
    private currentAccount;
    constructor();
    private jsonParser;
    private launcherToUser;
    private getVersion;
    get_auth(): Promise<{
        jvm: string;
        token: LauncherAccount;
    } | null>;
    login(credentials: Credentials, auth_provider: AUTH_PROVIDERS): Promise<LauncherAccount | null>;
    choose_profile(): Promise<LauncherProfile | null>;
    choose_account(): Promise<LauncherAccount | null>;
    run_minecraft(_name?: string): Promise<200 | null>;
    configure_settings(): Promise<void>;
    install_version(): Promise<void>;
    remove_account(): Promise<void>;
    delete_profile(): Promise<void>;
}
