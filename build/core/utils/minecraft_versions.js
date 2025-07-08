"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMinecraftVersionManifest = fetchMinecraftVersionManifest;
exports.fetchMinecraftVersions = fetchMinecraftVersions;
exports.askForVersion = askForVersion;
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
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
async function askForVersion(mcVersions, latestMC) {
    const versions = mcVersions.filter(v => v.id && v.type);
    const versionTypes = Array.from(new Set(versions.map(v => v.type)));
    const { selectedType } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'selectedType',
            message: '📦 Select version type:',
            choices: versionTypes
        }
    ]);
    const filteredVersions = versions.filter(v => v.type === selectedType);
    const { minecraftVersion } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'minecraftVersion',
            message: `🎮 Select Minecraft version (${selectedType}):`,
            choices: filteredVersions.map(v => v.id),
            default: latestMC
        }
    ]);
    return minecraftVersion;
}
//# sourceMappingURL=minecraft_versions.js.map