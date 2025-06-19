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
exports.fetchVersionManifest = fetchVersionManifest;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fsPromises = fs.promises;
async function fetchVersionManifest(client, manifestUrl, cache) {
    try {
        let body;
        try {
            const response = await axios_1.default.get(manifestUrl);
            body = response.data;
            if (!fs.existsSync(cache)) {
                await fsPromises.mkdir(cache, { recursive: true });
                client.client.emit('debug', '[MCLC]: Cache directory created.');
            }
            await fsPromises.writeFile(path.join(cache, 'version_manifest.json'), body);
            client.client.emit('debug', '[MCLC]: Cached version_manifest.json');
        }
        catch (error) {
            if (error.code === 'ENOTFOUND') {
                body = await fsPromises.readFile(path.join(cache, 'version_manifest.json'), 'utf-8');
            }
            else {
                return Promise.resolve(error);
            }
        }
        const parsed = JSON.parse(body);
        const desiredVersion = parsed.versions.find((version) => (version.id) === client.options?.version.number);
        if (!desiredVersion) {
            throw new Error(`Failed to find version ${client.options?.version.number} in version_manifest.json`);
        }
        try {
            const response = await axios_1.default.get(desiredVersion.url);
            const versionBody = response.data;
            await fsPromises.writeFile(path.join(cache, `${client.options?.version.number}.json`), versionBody);
            client.client.emit('debug', `[MCLC]: Cached ${client.options?.version.number}.json`);
            client.version = JSON.parse(versionBody);
        }
        catch (error) {
            if (error.code === 'ENOTFOUND') {
                const cachedBody = await fsPromises.readFile(path.join(cache, `${client.options?.version.number}.json`), 'utf-8');
                client.version = JSON.parse(cachedBody);
            }
            else {
                throw error;
            }
        }
        client.client.emit('debug', '[MCLC]: Parsed version from version manifest');
        return client.version;
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=utils.js.map