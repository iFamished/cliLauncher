import * as Authenticator from "../../../../tools/authenticator";
import { LauncherAccount } from "../../../../../types/launcher";
import { Credentials, IAuthMetadata, IAuthProvider } from "../../../../../types/account";
import get_authlib from "../../../../tools/authlib";
import { logger } from "../../../launch/handler";

export default class MojangAuth implements IAuthProvider {
    private credentials: Credentials;
    private account: LauncherAccount | null = null;
    private server: string = 'https://littleskin.cn/api/yggdrasil';

    public metadata: IAuthMetadata = {
        name: 'Little Skin',
        base: 'Mojang'
    };

    constructor(email: string, password: string) {
        this.credentials = { email, password };
        Authenticator.auth_server(this.server+"/authserver")
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
        return await get_authlib(this.server);
    }

    public async authenticate(): Promise<LauncherAccount | null> {
        try {
            const auth = await Authenticator.getAuth(this.credentials.email, this.credentials.password);

            this.account = {
                id: auth.uuid,
                name: auth.name,
                uuid: auth.uuid,
                access_token: auth.access_token,
                client_token: auth.client_token,
                user_properties: auth.user_properties,
                credentials: this.credentials,
                auth: this.metadata,
                validation: !!(await Authenticator.validate(auth.access_token, auth.client_token)),
                meta: {
                    type: "mojang",
                    demo: false
                },
            };

            logger.log(`✅ Mojang: Logged in as ${auth.name} (${auth.uuid})`);
            return this.account;
        } catch (err) {
            logger.error("❌ Mojang authentication failed:", (err as Error).message);
            return null;
        }
    }

    public async token(): Promise<LauncherAccount | null> {
        if (!this.account) {
            logger.warn("⚠️ No Mojang token available. Re-authenticating...");
            return await this.authenticate();
        }

        const { access_token, client_token } = this.account;

        try {
            const isValid = await Authenticator.validate(access_token, client_token || "");
            if (!isValid) {
                const refreshed = await Authenticator.refreshAuth(access_token, client_token || "");
                this.account = {
                    id: refreshed.uuid,
                    name: refreshed.name,
                    uuid: refreshed.uuid,
                    access_token: refreshed.access_token,
                    client_token: refreshed.client_token,
                    user_properties: refreshed.user_properties,     
                    credentials: this.credentials,
                    auth: this.metadata,
                    validation: !!(await Authenticator.validate(refreshed.access_token, refreshed.client_token)),
                    meta: {
                        type: "mojang",
                        demo: false
                    },
                };
                logger.log("🔄 Mojang token refreshed.");
            }

            return this.account;
        } catch (err) {
            logger.warn("⚠️ Mojang token refresh failed. Re-authenticating...");
            return await this.authenticate();
        }
    }
}