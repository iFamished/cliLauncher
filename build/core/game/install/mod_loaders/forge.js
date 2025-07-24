"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const path_1 = __importDefault(require("path"));
const download_1 = require("../../../utils/download");
const common_1 = require("../../../utils/common");
const executor_1 = require("../../../tools/executor");
const launcher_1 = __importDefault(require("../../../tools/launcher"));
const handler_1 = require("../../launch/handler");
const vanilla_1 = require("../vanilla");
const metadata = {
    name: 'Forge',
    description: 'A most widely used modding platform for Minecraft Java Edition.',
    author: 'MinecraftForge',
    jvm: '-Djava.net.preferIPv6Addresses=system',
};
const FORGE_FILES = 'https://files.minecraftforge.net';
const FORGE_BASE = 'https://maven.minecraftforge.net';
function getForgeInstallerJarUrl(version) {
    return `${FORGE_BASE}/net/minecraftforge/forge/${version}/forge-${version}-installer.jar`;
}
async function fetchAllForgeVersions() {
    const url = `${FORGE_FILES}/net/minecraftforge/forge/maven-metadata.json`;
    const res = await axios_1.default.get(url);
    const data = res.data;
    return Object.keys(data).map(mcVersion => ({
        id: mcVersion,
        forge: data[mcVersion]
    }));
}
const INSTALLER_DIR = path_1.default.join((0, common_1.localpath)(true), 'forge-client');
async function installForgeViaExecutor() {
    const spinner = (0, ora_1.default)('🛠️ Preparing Forge installation...').start();
    try {
        const manifest = await fetchAllForgeVersions();
        const mcVersions = manifest.map(entry => entry.id);
        const latestMC = mcVersions[mcVersions.length - 1];
        spinner.stop();
        const { minecraftVersion } = await inquirer_1.default.prompt({
            type: 'list',
            name: 'minecraftVersion',
            message: '🎮 Select Minecraft version:',
            choices: mcVersions,
            default: latestMC
        });
        spinner.stop();
        const isVanillaInstalled = (0, vanilla_1.isMinecraftVersionInstalled)(minecraftVersion);
        if (!isVanillaInstalled) {
            await (0, vanilla_1.installVanillaHelper)(minecraftVersion);
        }
        const forgeEntry = manifest.find(f => f.id === minecraftVersion);
        if (!forgeEntry)
            throw new Error(`No Forge versions found for Minecraft ${minecraftVersion}`);
        const latestForge = forgeEntry.forge[forgeEntry.forge.length - 1];
        const { forgeVersion } = await inquirer_1.default.prompt({
            type: 'list',
            name: 'forgeVersion',
            message: '🧱 Select Forge version:',
            choices: forgeEntry.forge,
            default: latestForge
        });
        const jarUrl = getForgeInstallerJarUrl(forgeVersion);
        const jarName = `forge-${forgeVersion}-installer.jar`;
        const jarPath = path_1.default.join(INSTALLER_DIR, jarName);
        (0, common_1.cleanDir)(INSTALLER_DIR);
        (0, common_1.ensureDir)(INSTALLER_DIR);
        spinner.start('📥 Downloading Forge installer...');
        spinner.stop();
        await (0, download_1.downloader)(jarUrl, jarPath);
        (0, common_1.waitForFolder)(metadata, minecraftVersion).then(versionFolder => {
            const profileManager = new launcher_1.default();
            const versionId = path_1.default.basename(versionFolder);
            profileManager.addProfile(versionId, minecraftVersion, versionId, metadata, versionId, metadata.name);
        });
        spinner.text = '🚀 Running Forge installer...';
        spinner.stop();
        await (0, executor_1.run)(jarPath, ['--installClient']);
        spinner.succeed('✅ Forge installed successfully!');
        return {
            name: metadata.name,
            version: `forge-${forgeVersion}`,
            url: jarUrl,
            client: {
                dir: INSTALLER_DIR,
                jar: jarName
            }
        };
    }
    catch (err) {
        spinner.fail('❌ Forge installation failed.');
        handler_1.logger.error(err.message || err);
        return null;
    }
}
// Run if invoked directly
if (require.main === module) {
    installForgeViaExecutor();
}
exports.default = {
    metadata,
    get: installForgeViaExecutor,
};
//# sourceMappingURL=forge.js.map