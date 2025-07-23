"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msmc_1 = require("msmc");
const tokens_1 = require("../../../../utils/tokens");
const handler_1 = require("../../../launch/handler");
class MicrosoftAuth {
    credentials;
    account = null;
    minecraft = null;
    metadata = {
        name: 'MSA',
        base: 'Microsoft'
    };
    constructor(email, password) {
        this.credentials = { email, password };
    }
    is_token(token) {
        if (!this.account)
            return false;
        if (this.account.id === token.id)
            return true;
        if (this.account.uuid === token.uuid)
            return true;
        if (this.account.credentials === this.credentials)
            return true;
        if (this.account.name && this.account.name === token.name)
            return true;
        return false;
    }
    set_credentials(email, password) {
        this.credentials = { email, password };
        return this.credentials;
    }
    async set_current(account) {
        this.account = account;
        const rawToken = account?.meta?.rawToken;
        if (rawToken) {
            try {
                const auth = new msmc_1.Auth("select_account");
                const reconstructed = await (0, tokens_1.fromMclcToken)(auth, rawToken, true);
                this.minecraft = reconstructed;
            }
            catch (e) {
                handler_1.logger.warn("⚠️ Failed to reconstruct msmc token: " + e.message);
                this.minecraft = null;
            }
        }
        return account;
    }
    async auth_lib() {
        return "";
    }
    async authenticate() {
        const authManager = new msmc_1.Auth("select_account");
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
            handler_1.logger.log(`✅ Microsoft: Logged in as ${this.account.name} (${this.account.uuid})`);
            return this.account;
        }
        catch (err) {
            handler_1.logger.error("❌ Microsoft authentication failed:", err.message);
            return null;
        }
    }
    async token() {
        if (!this.minecraft) {
            handler_1.logger.warn("⚠️ No valid Minecraft token, re-authenticating...");
            return await this.authenticate();
        }
        if (!this.minecraft.validate()) {
            try {
                await this.minecraft.refresh(true);
            }
            catch {
                handler_1.logger.warn("⚠️ Token refresh failed. Re-authenticating...");
                return await this.authenticate();
            }
        }
        if (!this.minecraft.validate()) {
            handler_1.logger.warn("⚠️ Token still invalid after refresh. Re-authenticating...");
            return await this.authenticate();
        }
        return this.account;
    }
}
exports.default = MicrosoftAuth;
//# sourceMappingURL=microsoft.js.map