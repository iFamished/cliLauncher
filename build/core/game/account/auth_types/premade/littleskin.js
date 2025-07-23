"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Authenticator = __importStar(require("../../../../tools/authenticator"));
const authlib_1 = __importDefault(require("../../../../tools/authlib"));
const handler_1 = require("../../../launch/handler");
class MojangAuth {
    credentials;
    account = null;
    server = 'https://littleskin.cn/api/yggdrasil';
    metadata = {
        name: 'Little Skin',
        base: 'Mojang'
    };
    constructor(email, password) {
        this.credentials = { email, password };
        Authenticator.auth_server(this.server + "/authserver");
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
        return await (0, authlib_1.default)(this.server);
    }
    async authenticate() {
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
            handler_1.logger.log(`✅ Mojang: Logged in as ${auth.name} (${auth.uuid})`);
            return this.account;
        }
        catch (err) {
            handler_1.logger.error("❌ Mojang authentication failed:", err.message);
            return null;
        }
    }
    async token() {
        if (!this.account) {
            handler_1.logger.warn("⚠️ No Mojang token available. Re-authenticating...");
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
                handler_1.logger.log("🔄 Mojang token refreshed.");
            }
            return this.account;
        }
        catch (err) {
            handler_1.logger.warn("⚠️ Mojang token refresh failed. Re-authenticating...");
            return await this.authenticate();
        }
    }
}
exports.default = MojangAuth;
//# sourceMappingURL=littleskin.js.map