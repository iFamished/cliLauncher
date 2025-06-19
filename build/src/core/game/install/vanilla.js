"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installVanillaViaExecutor = installVanillaViaExecutor;
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const minecraft_versions_1 = require("../../utils/minecraft_versions");
const download_1 = require("../../utils/download");
const common_1 = require("../../utils/common");
const launcher_1 = __importDefault(require("../../tools/launcher"));
const handler_1 = require("../launch/handler");
const metadata = {
    name: 'Vanilla',
    description: 'Pure, unmodded Minecraft client.',
    author: 'Mojang'
};
async function installVanillaViaExecutor() {
    const spinner = (0, ora_1.default)('🌱 Preparing Vanilla installation...').start();
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
        const versionMeta = manifest.versions.find(v => v.id === minecraftVersion);
        if (!versionMeta)
            throw new Error('Version metadata not found.');
        spinner.start('🔍 Fetching version metadata...');
        const res = await axios_1.default.get(versionMeta.url);
        const versionData = res.data;
        let versionFolder = path_1.default.join((0, common_1.minecraft_dir)(), 'versions', minecraftVersion);
        versionFolder = ensureVersionDir(versionFolder);
        const jarUrl = versionData.downloads.client.url;
        const jarPath = path_1.default.join(versionFolder, `${minecraftVersion}.jar`);
        const jsonPath = path_1.default.join(versionFolder, `${minecraftVersion}.json`);
        spinner.text = '📥 Downloading client JAR...';
        spinner.stop();
        await (0, download_1.downloader)(jarUrl, jarPath);
        spinner.text = '📥 Downloading version JSON...';
        const versionJson = JSON.stringify(versionData, null, 2);
        fs_1.default.writeFileSync(jsonPath, versionJson);
        spinner.text = '🧩 Creating launcher profile...';
        const profileManager = new launcher_1.default();
        const name = path_1.default.basename(versionFolder);
        profileManager.addProfile(name, minecraftVersion, name, metadata, name, 'Grass');
        spinner.succeed(`🎉 Vanilla ${minecraftVersion} installed successfully!`);
        return {
            name: metadata.name,
            version: minecraftVersion,
            url: jarUrl,
            client: {
                dir: versionFolder,
                jar: `${minecraftVersion}.jar`
            }
        };
    }
    catch (err) {
        spinner.fail('❌ Failed to install Vanilla.');
        handler_1.logger.error(err.message || err);
        return null;
    }
}
// Run if invoked directly
if (require.main === module) {
    installVanillaViaExecutor();
}
exports.default = {
    metadata,
    get: installVanillaViaExecutor,
};
function ensureVersionDir(dir, i = 1) {
    if (fs_1.default.existsSync(dir)) {
        const contents = fs_1.default.readdirSync(dir);
        if (contents.length === 0 || !contents.find(v => v.endsWith('.json')) || contents.find(v => v.endsWith('.jar'))) {
            (0, common_1.cleanDir)(dir);
            return ensureVersionDir(dir, i);
        }
        const baseName = path_1.default.basename(dir);
        const parentDir = path_1.default.dirname(dir);
        const newDir = path_1.default.join(parentDir, `${baseName} (${i})`);
        return ensureVersionDir(newDir, i + 1);
    }
    (0, common_1.ensureDir)(dir);
    return dir;
}
;
//# sourceMappingURL=vanilla.js.map