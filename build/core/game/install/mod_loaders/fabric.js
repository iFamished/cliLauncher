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
const launcher_1 = __importDefault(require("../../../tools/launcher"));
const handler_1 = require("../../launch/handler");
const vanilla_1 = require("../vanilla");
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
async function installFabricViaExecutor(version, loader_ver) {
    const spinner = (0, ora_1.default)('🧵 Preparing Fabric installation...').start();
    try {
        const manifest = await (0, minecraft_versions_1.fetchMinecraftVersionManifest)();
        const latestMC = manifest.latest.release;
        spinner.stop();
        const minecraftVersion = version || await (0, minecraft_versions_1.askForVersion)(manifest.versions, latestMC);
        spinner.stop();
        const isVanillaInstalled = (0, vanilla_1.isMinecraftVersionInstalled)(minecraftVersion);
        if (!isVanillaInstalled) {
            await (0, vanilla_1.installVanillaHelper)(minecraftVersion);
        }
        const loaderVersions = await getAvailableLoaders();
        const { loaderVersion } = loader_ver ? { loaderVersion: loader_ver } : await inquirer_1.default.prompt([
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
        spinner.stop();
        await (0, download_1.downloader)(jarUrl, jarPath);
        spinner.text = '🚀 Executing Fabric installer...';
        (0, common_1.waitForFolder)(metadata, minecraftVersion).then(versionFolder => {
            const profileManager = new launcher_1.default();
            const versionId = path_1.default.basename(versionFolder);
            profileManager.addProfile(versionId, minecraftVersion, versionId, metadata, versionId, metadata.name);
        });
        spinner.stop();
        await (0, executor_1.run)(jarPath, [
            'client',
            `-snapshot`,
            `-dir`, (0, common_1.minecraft_dir)(),
            `-mcversion`, minecraftVersion,
            `-loader`, loaderVersion
        ]);
        spinner.text = 'Cleaning caches';
        await (0, common_1.cleanAfterInstall)(INSTALLER_DIR);
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
        handler_1.logger.error(err.message || err);
        return null;
    }
}
// Run if invoked directly
if (require.main === module) {
    installFabricViaExecutor();
}
exports.default = {
    metadata,
    get: installFabricViaExecutor,
};
//# sourceMappingURL=fabric.js.map