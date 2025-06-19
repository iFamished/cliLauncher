import { AUTH_PROVIDERS, Credentials } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
import { Logger } from "../../tools/logger";
export declare const logger: Logger;
export declare const progress: import("../../tools/logger").ProgressReport;
export declare class Handler {
    private profiles;
    private accounts;
    private settings;
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
    run_minecraft(name: string): Promise<200 | null>;
    configure_settings(): Promise<void>;
}
