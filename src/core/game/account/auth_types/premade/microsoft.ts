import { Auth, Minecraft } from 'msmc';
import { LauncherAccount } from '../../../../../types/launcher';
import { Credentials, IAuthMetadata, IAuthProvider } from '../../../../../types/account';
import { fromMclcToken } from '../../../../utils/tokens';
import { logger } from '../../../launch/handler';

export default class MicrosoftAuth implements IAuthProvider {
    private credentials: Credentials;
    private account: LauncherAccount | null = null;
    private minecraft: Minecraft | null = null;

    public metadata: IAuthMetadata = {
        name: 'MSA',
        base: 'Microsoft'
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

        const rawToken = account?.meta?.rawToken;
        if (rawToken) {
            try {
                const auth = new Auth("select_account");
                const reconstructed = await fromMclcToken(auth, rawToken, true);
                
                this.minecraft = reconstructed;
            } catch (e) {
                logger.warn("⚠️ Failed to reconstruct msmc token: " + (e as Error).message);
                this.minecraft = null;
            }
        }

        return account;
    }

    public async auth_lib(): Promise<string> {
        return "";
    }

    public async authenticate(): Promise<LauncherAccount | null> {
        const authManager = new Auth("select_account");

        try {
            const xboxManager = await authManager.launch("raw");
            const minecraft = await xboxManager.getMinecraft();
            const mclcAuth = minecraft.mclc();

            this.minecraft = minecraft;

            this.account = {
                ...mclcAuth,
                id: mclcAuth.uuid,
                auth: this.metadata,
                validation: minecraft.validate(),
                credentials: this.credentials,
                meta: {
                    type: "msa",
                    rawToken: mclcAuth,
                    ...mclcAuth.meta,
                },
            };

            logger.log(`✅ Microsoft: Logged in as ${this.account.name} (${this.account.uuid})`);
            return this.account;
        } catch (err) {
            logger.error("❌ Microsoft authentication failed:", (err as Error).message);
            return null;
        }
    }

    public async token(): Promise<LauncherAccount | null> {
        if (!this.minecraft) {
            logger.warn("⚠️ No valid Minecraft token, re-authenticating...");
            return await this.authenticate();
        }

        if (!this.minecraft.validate()) {
            try {
                await this.minecraft.refresh(true);
            } catch {
                logger.warn("⚠️ Token refresh failed. Re-authenticating...");
                return await this.authenticate();
            }
        }

        if (!this.minecraft.validate()) {
            logger.warn("⚠️ Token still invalid after refresh. Re-authenticating...");
            return await this.authenticate();
        }

        return this.account;
    }
}
