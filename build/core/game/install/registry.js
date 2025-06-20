"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallerRegistry = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class InstallerRegistry {
    providers = new Map();
    constructor() {
        this.registerBuiltins();
        this.registerModLoaders();
    }
    registerBuiltins() {
        const vanilla = require('./vanilla').default;
        this.register(vanilla);
    }
    registerModLoaders() {
        const dir = path_1.default.join(__dirname, 'mod_loaders');
        if (!fs_1.default.existsSync(dir))
            return;
        for (const file of fs_1.default.readdirSync(dir)) {
            if (!file.endsWith('.ts') && !file.endsWith('.js'))
                continue;
            const loader = require(path_1.default.join(dir, file)).default;
            if (loader?.metadata?.name) {
                this.register(loader);
            }
        }
    }
    register(provider) {
        const key = provider.metadata.name.toLowerCase();
        this.providers.set(key, provider);
    }
    get(name) {
        return this.providers.get(name.toLowerCase());
    }
    list() {
        return Array.from(this.providers.keys());
    }
    all() {
        return Array.from(this.providers.values());
    }
}
exports.InstallerRegistry = InstallerRegistry;
//# sourceMappingURL=registry.js.map