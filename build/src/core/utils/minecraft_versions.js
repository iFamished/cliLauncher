"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMinecraftVersionManifest = fetchMinecraftVersionManifest;
exports.fetchMinecraftVersions = fetchMinecraftVersions;
const axios_1 = __importDefault(require("axios"));
let versions_manifest = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
async function fetchMinecraftVersionManifest() {
    let req = await axios_1.default.get(versions_manifest);
    let _test = req.data.versions;
    return req.data;
}
async function fetchMinecraftVersions() {
    const response = await axios_1.default.get(versions_manifest);
    return response.data.versions
        .filter((v) => v.type === 'release')
        .map((v) => v.id);
}
//# sourceMappingURL=minecraft_versions.js.map