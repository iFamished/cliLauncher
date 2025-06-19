"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installFabricViaExecutor = installFabricViaExecutor;
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const path_1 = __importDefault(require("path"));
const minecraft_versions_1 = require("../../../utils/minecraft_versions");
const download_1 = require("../../../utils/download");
const common_1 = require("../../../utils/common");
const executor_1 = require("../../../tools/executor");
const metadata = {
    name: 'Fabric',
    description: 'A lightweight, experimental modding toolchain for Minecraft.',
    author: 'FabricMC'
};
const FABRIC_META = 'https://meta.fabricmc.net/v2';
const FABRIC_MAVEN = `https://maven.fabricmc.net`;
const INSTALLER_DIR = path_1.default.join((0, common_1.localpath)(true), 'fabric-client');
async function getLatestInstaller() {
    const res = await axios_1.default.get(`${FABRIC_META}/versions/installer`);
    const latest = res.data.find((v) => v.stable);
    return latest.version;
}
async function getAvailableLoaders() {
    const res = await axios_1.default.get(`${FABRIC_META}/versions/loader`);
    return res.data.map((v) => v.version);
}
async function getInstallerJarUrl(installerVersion) {
    return `${FABRIC_MAVEN}/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;
}
async function installFabricViaExecutor() {
    const spinner = (0, ora_1.default)('🧵 Preparing Fabric installation...').start();
    try {
        const manifest = await (0, minecraft_versions_1.fetchMinecraftVersionManifest)();
        const mcVersions = manifest.versions.filter(v => v.id).map(v => v.id);
        const latestMC = manifest.latest.release;
        spinner.stop();
        const { minecraftVersion } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'minecraftVersion',
                message: '🎮 Select Minecraft version:',
                choices: mcVersions,
                default: latestMC
            }
        ]);
        const loaderVersions = await getAvailableLoaders();
        const { loaderVersion } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'loaderVersion',
                message: '🧵 Pick Fabric loader version:',
                choices: loaderVersions,
                loop: false
            }
        ]);
        const installerVersion = await getLatestInstaller();
        const jarUrl = await getInstallerJarUrl(installerVersion);
        const jarName = `fabric-installer-${installerVersion}.jar`;
        const jarPath = path_1.default.join(INSTALLER_DIR, jarName);
        (0, common_1.cleanDir)(INSTALLER_DIR);
        (0, common_1.ensureDir)(INSTALLER_DIR);
        spinner.text = '📦 Downloading Fabric installer...';
        await (0, download_1.downloader)(jarUrl, jarPath);
        spinner.text = '🚀 Executing Fabric installer...';
        spinner.stop();
        await (0, executor_1.run)(jarPath, [
            'client',
            `-snapshot`,
            `-dir`, (0, common_1.minecraft_dir)(),
            `-mcversion`, minecraftVersion,
            `-loader`, loaderVersion
        ]);
        spinner.succeed('🎉 Fabric installed successfully!');
        return {
            name: metadata.name,
            version: minecraftVersion,
            url: jarUrl,
            client: { dir: INSTALLER_DIR, jar: jarName }
        };
    }
    catch (err) {
        spinner.fail('❌ Failed to install Fabric.');
        console.error(err.message || err);
        return null;
    }
}
// Run if invoked directly
if (require.main === module) {
    installFabricViaExecutor();
}
//# sourceMappingURL=fabric.js.map