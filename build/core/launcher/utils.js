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
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function fetchAndCache(url, cachePath, label, emit) {
    try {
        const { data } = await axios_1.default.get(url);
        const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, body);
        emit(`[MCLC]: Cached ${label}`);
        return body;
    }
    catch (err) {
        emit(`[MCLC]: Failed to fetch ${label} from network. Trying cache...`);
        try {
            return await fs.readFile(cachePath, 'utf-8');
        }
        catch {
            throw new Error(`[MCLC]: Unable to load ${label} from both network and cache.`);
        }
    }
}
async function fetchVersionManifest(client, manifestUrl, cacheDir) {
    const emit = (msg) => client.client.emit('debug', msg);
    const versionId = client.options?.version.number;
    if (!versionId)
        throw new Error('Version number not specified in client options.');
    const manifestCachePath = path.join(cacheDir, 'version_manifest.json');
    const manifestRaw = await fetchAndCache(manifestUrl, manifestCachePath, 'version_manifest.json', emit);
    let manifest;
    try {
        manifest = JSON.parse(manifestRaw);
    }
    catch {
        throw new Error('[MCLC]: Failed to parse version_manifest.json');
    }
    const versionMeta = manifest.versions.find(v => v.id === versionId);
    if (!versionMeta)
        throw new Error(`[MCLC]: Version ${versionId} not found in manifest.`);
    const versionCachePath = path.join(cacheDir, `${versionId}.json`);
    const versionRaw = await fetchAndCache(versionMeta.url, versionCachePath, `${versionId}.json`, emit);
    try {
        client.version = JSON.parse(versionRaw);
    }
    catch {
        throw new Error(`[MCLC]: Failed to parse ${versionId}.json`);
    }
    emit(`[MCLC]: Loaded version ${versionId} metadata`);
    return client.version;
}
//# sourceMappingURL=utils.js.map