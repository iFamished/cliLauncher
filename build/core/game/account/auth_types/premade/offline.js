"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../launch/handler");
const uuid_1 = require("uuid");
const defaults_1 = require("../../../../../config/defaults");
const chalk_1 = __importDefault(require("chalk"));
class MojangAuth {
    credentials;
    account = null;
    metadata = {
        name: chalk_1.default.bold.redBright('Offline'),
        base: '! (NOT RECCOMENDED) !',
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
        return account;
    }
    async auth_lib() {
        return "";
    }
    async authenticate() {
        try {
            let uuid = (0, uuid_1.v4)();
            this.account = {
                id: uuid,
                name: this.credentials.email,
                uuid,
                access_token: defaults_1.ORIGAMI_CLIENT_TOKEN,
                client_token: defaults_1.ORIGAMI_CLIENT_TOKEN,
                user_properties: "",
                credentials: this.credentials,
                auth: this.metadata,
                validation: true,
            };
            handler_1.logger.log(`✅ OFFLINE MODE: Logged in as ${this.credentials.email} (${uuid})`);
            return this.account;
        }
        catch (err) {
            handler_1.logger.error("❌ OFFLINE MODE failed:", err.message);
            return null;
        }
    }
    async token() {
        if (!this.account) {
            handler_1.logger.warn("⚠️ No OFFLINE token available. Re-authenticating...");
            return await this.authenticate();
        }
        return this.account;
    }
}
exports.default = MojangAuth;
//# sourceMappingURL=offline.js.map