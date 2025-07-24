import axios from 'axios';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { askForVersion, fetchMinecraftVersionManifest } from '../../utils/minecraft_versions';
import { downloader } from '../../utils/download';
import { cleanDir, ensureDir, minecraft_dir } from '../../utils/common';
import { ClientJar } from '../../../types/client';
import LauncherProfileManager from '../../tools/launcher';
import { logger } from '../launch/handler';

const metadata = {
    name: 'Vanilla',
    description: 'Pure, unmodded Minecraft client.',
    author: 'Mojang'
};

export async function installVanillaViaExecutor(version?: string): Promise<ClientJar | null> {
    const spinner = ora('🌱 Preparing Vanilla installation...').start();

    try {
        const manifest = await fetchMinecraftVersionManifest();
        const latestMC = manifest.latest.release;

        spinner.stop();

        const minecraftVersion = version ?? await askForVersion(manifest.versions, latestMC);

        const versionMeta = manifest.versions.find(v => v.id === minecraftVersion);
        if (!versionMeta) throw new Error('Version metadata not found.');

        spinner.start('🔍 Fetching version metadata...');
        const res = await axios.get(versionMeta.url);
        const versionData = res.data;

        let versionFolder = path.join(minecraft_dir(), 'versions', minecraftVersion);
        
        cleanDir(versionFolder);
        ensureDir(versionFolder);

        const jarUrl = versionData.downloads.client.url;
        const jarPath = path.join(versionFolder, `${minecraftVersion}.jar`);
        const jsonPath = path.join(versionFolder, `${minecraftVersion}.json`);

        spinner.text = '📥 Downloading client JAR...';
        spinner.stop();
        await downloader(jarUrl, jarPath);

        spinner.text = '📥 Downloading version JSON...';
        const versionJson = JSON.stringify(versionData, null, 2);
        fs.writeFileSync(jsonPath, versionJson);

        spinner.text = '🧩 Creating launcher profile...';

        const profileManager = new LauncherProfileManager();
        const name = path.basename(versionFolder);
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
    } catch (err: any) {
        spinner.fail('❌ Failed to install Vanilla.');
        logger.error(err.message || err);
        return null;
    }
}

export function isMinecraftVersionInstalled(version: string): Boolean {
    const profileManager = new LauncherProfileManager();
    return profileManager.getProfile(version) ? true : false;
}

export async function installVanillaHelper(version: string): Promise<ClientJar | null> {
    return await installVanillaViaExecutor(version);
}

// Run if invoked directly
if (require.main === module) {
    installVanillaViaExecutor();
}

export default {
    metadata,
    get: installVanillaViaExecutor,
};