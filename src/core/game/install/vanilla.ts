import axios from 'axios';
import inquirer from 'inquirer';
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

export async function installVanillaViaExecutor(): Promise<ClientJar | null> {
    const spinner = ora('🌱 Preparing Vanilla installation...').start();

    try {
        const manifest = await fetchMinecraftVersionManifest();
        const latestMC = manifest.latest.release;

        spinner.stop();

        const minecraftVersion = await askForVersion(manifest.versions, latestMC);

        const versionMeta = manifest.versions.find(v => v.id === minecraftVersion);
        if (!versionMeta) throw new Error('Version metadata not found.');

        spinner.start('🔍 Fetching version metadata...');
        const res = await axios.get(versionMeta.url);
        const versionData = res.data;

        let versionFolder = path.join(minecraft_dir(), 'versions', minecraftVersion);
        versionFolder = ensureVersionDir(versionFolder);

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

// Run if invoked directly
if (require.main === module) {
    installVanillaViaExecutor();
}

export default {
    metadata,
    get: installVanillaViaExecutor,
};

function ensureVersionDir(dir: string, i: number = 1): string {
    if (fs.existsSync(dir)) {
        const contents = fs.readdirSync(dir);
        if (contents.length === 0 || !contents.find(v => v.endsWith('.json')) || contents.find(v => v.endsWith('.jar'))) {
            cleanDir(dir);
            return ensureVersionDir(dir, i);
        }

        const baseName = path.basename(dir);
        const parentDir = path.dirname(dir);
        const newDir = path.join(parentDir, `${baseName} (${i})`);
        return ensureVersionDir(newDir, i + 1);
    }

    ensureDir(dir);
    return dir;
};