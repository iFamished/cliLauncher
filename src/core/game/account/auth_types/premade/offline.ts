import { LauncherAccount } from "../../../../../types/launcher";
import { Credentials, IAuthMetadata, IAuthProvider } from "../../../../../types/account";
import { logger } from "../../../launch/handler";
import { v4 } from "uuid";
import { ORIGAMI_CLIENT_TOKEN } from "../../../../../config/defaults";
import chalk from "chalk";
import { get } from "../../../../tools/data_manager";

export default class MojangAuth implements IAuthProvider {
    private credentials: Credentials;
    private account: LauncherAccount | null = null;

    public metadata: IAuthMetadata = {
        name: chalk.bold.redBright('Offline'),
        base: '! (NOT RECCOMENDED) !',
    };

    constructor(email: string, password: string) {
        this.credentials = { email, password };
    }

    is_token(token: LauncherAccount): boolean {
        if(!this.account) return false;

        if(this.account.id === token.id) return true;
        if(this.account.uuid === token.uuid) return true;
        if(this.account.credentials === this.credentials) return true;
        if(this.account.name && this.account.name === token.name) return true;

        return false;
    }

    public set_credentials(email: string, password: string): Credentials {
        this.credentials = { email, password };
        return this.credentials;
    }

    public async set_current(account: LauncherAccount): Promise<LauncherAccount> {
        this.account = account;
        return account;
    }

    public async auth_lib(): Promise<string> {
        return "";
    }

    public async authenticate(): Promise<LauncherAccount | null> {
        try {
            let uuid = v4();

            this.account = {
                id: uuid,
                name: this.credentials.email,
                uuid,
                access_token: ORIGAMI_CLIENT_TOKEN,
                client_token: ORIGAMI_CLIENT_TOKEN,
                user_properties: "",
                credentials: this.credentials,
                auth: this.metadata,
                validation: true,
            };

            logger.log(`✅ OFFLINE MODE: Logged in as ${this.credentials.email} (${uuid})`);
            return this.account;
        } catch (err) {
            logger.error("❌ OFFLINE MODE failed:", (err as Error).message);
            return null;
        }
    }

    public async token(): Promise<LauncherAccount | null> {
        if (!this.account) {
            logger.warn("⚠️ No OFFLINE token available. Re-authenticating...");
            return await this.authenticate();
        }

        return this.account;
    }
}