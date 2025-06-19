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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthProviders = getAuthProviders;
exports.getAuthProvider = getAuthProvider;
const handler_1 = require("../launch/handler");
const providers = {
    ely_by: () => Promise.resolve().then(() => __importStar(require('./auth_types/ely_by'))),
    littleskin: () => Promise.resolve().then(() => __importStar(require('./auth_types/littleskin'))),
    meowskin: () => Promise.resolve().then(() => __importStar(require('./auth_types/meowskin'))),
    microsoft: () => Promise.resolve().then(() => __importStar(require('./auth_types/microsoft'))),
};
async function getAuthProviders() {
    const map = new Map();
    for (const [key, loader] of Object.entries(providers)) {
        const module = await loader();
        map.set(key, module.default);
    }
    return map;
}
async function getAuthProvider(account) {
    try {
        const providers = await getAuthProviders();
        if (typeof account === "string") {
            const AuthClass = providers.get(account);
            if (!AuthClass) {
                handler_1.logger.error(`🔍 AuthProvider '${account}' not found in registry.`);
                return null;
            }
            return new AuthClass("", "");
        }
        const AuthClass = providers.get(account.auth);
        if (!AuthClass) {
            handler_1.logger.log(`AuthProvider: '${account.auth}' not found`);
            return null;
        }
        let auth_provider = new AuthClass(account.credentials.email, account.credentials.password);
        await auth_provider.set_current(account);
        return auth_provider;
    }
    catch (_) {
        return null;
    }
}
//# sourceMappingURL=index.js.map