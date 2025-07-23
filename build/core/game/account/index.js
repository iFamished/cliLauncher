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
exports.authRegistry = void 0;
exports.registerAuthProvider = registerAuthProvider;
exports.loadAllAuthProviders = loadAllAuthProviders;
exports.getAuthProviders = getAuthProviders;
exports.getAuthProvider = getAuthProvider;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const handler_1 = require("../launch/handler");
const chalk_1 = __importDefault(require("chalk"));
const data_manager_1 = require("../../tools/data_manager");
exports.authRegistry = new Map();
const loadedTimestamps = new Map();
function registerAuthProvider(name, loader) {
    exports.authRegistry.set(name, loader);
}
async function loadAllAuthProviders() {
    const root = path_1.default.join(__dirname, "auth_types");
    const folders = ["premade", "usermade"];
    for (const folder of folders) {
        const dir = path_1.default.join(root, folder);
        if (!fs_extra_1.default.existsSync(dir))
            continue;
        const files = fs_extra_1.default.readdirSync(dir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
        for (const file of files) {
            const fullPath = path_1.default.join(dir, file);
            const stats = fs_extra_1.default.statSync(fullPath);
            const lastModified = stats.mtimeMs;
            if (loadedTimestamps.get(fullPath) === lastModified)
                continue;
            const name = path_1.default.basename(file, path_1.default.extname(file));
            try {
                let providerCtor = (await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)))).default;
                if (!providerCtor)
                    throw new Error('invalid provider');
                let metadata = new providerCtor('', '').metadata;
                if (metadata.name === chalk_1.default.bold.redBright('Offline') && !(0, data_manager_1.get)('allow:offline_auth')) {
                    let registered = exports.authRegistry.get(metadata.name);
                    if (registered)
                        exports.authRegistry.delete(metadata.name);
                    continue;
                }
                registerAuthProvider(metadata.name, async () => await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s))));
                loadedTimestamps.set(fullPath, lastModified);
            }
            catch (err) {
                handler_1.logger.warn(`⚠️ Failed to register auth provider '${name}': ${err.message}`);
            }
        }
    }
}
async function getAuthProviders() {
    await loadAllAuthProviders();
    const map = new Map();
    for (const [key, loader] of exports.authRegistry.entries()) {
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
        const AuthClass = providers.get(account.auth.name);
        if (!AuthClass) {
            handler_1.logger.log(`AuthProvider: '${account.auth.name}' not found`);
            return null;
        }
        let auth_provider = new AuthClass(account.credentials.email, account.credentials.password);
        await auth_provider.set_current(account);
        return auth_provider;
    }
    catch (err) {
        handler_1.logger.error('Failed to get auth provider:', err.message);
        return null;
    }
}
//# sourceMappingURL=index.js.map