import axios from 'axios';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { downloader } from '../../../utils/download';
import { ensureDir, cleanDir, localpath, waitForFolder, cleanAfterInstall } from '../../../utils/common';
import { run as executeJar } from '../../../tools/executor';
import { ClientJar } from '../../../../types/client';
import { ForgeVersions } from '../../../../types/version';
import LauncherProfileManager from '../../../tools/launcher';
import { logger } from '../../launch/handler';
import { isMinecraftVersionInstalled, installVanillaHelper } from '../vanilla';

const metadata = {
    name: 'Forge',
    description: 'A most widely used modding platform for Minecraft Java Edition.',
    author: 'MinecraftForge',
};

const FORGE_FILES = 'https://files.minecraftforge.net';
const FORGE_BASE = 'https://maven.minecraftforge.net';

function getForgeInstallerJarUrl(version: string): string {
    return `${FORGE_BASE}/net/minecraftforge/forge/${version}/forge-${version}-installer.jar`;
}

async function fetchAllForgeVersions(): Promise<ForgeVersions[]> {
    const url = `${FORGE_FILES}/net/minecraftforge/forge/maven-metadata.json`;
    const res = await axios.get(url);
    const data = res.data as Record<string, string[]>;

    return Object.keys(data).map(mcVersion => ({
        id: mcVersion,
        forge: data[mcVersion]
    }));
}

const INSTALLER_DIR = path.join(localpath(true), 'forge-client');

async function installForgeViaExecutor(version?: string, loader_ver?: string): Promise<ClientJar | null> {
    const spinner = ora('🛠️ Preparing Forge installation...').start();

    try {
        const manifest = await fetchAllForgeVersions();
        const mcVersions = manifest.map(entry => entry.id);
        const latestMC = mcVersions[mcVersions.length - 1];

        spinner.stop();
        const { minecraftVersion } = version ? { minecraftVersion: version } : await inquirer.prompt({
            type: 'list',
            name: 'minecraftVersion',
            message: '🎮 Select Minecraft version:',
            choices: mcVersions,
            default: latestMC
        });

        spinner.stop();
        const isVanillaInstalled = isMinecraftVersionInstalled(minecraftVersion);
        if (!isVanillaInstalled) {
            await installVanillaHelper(minecraftVersion);
        }

        const forgeEntry = manifest.find(f => f.id === minecraftVersion);
        if (!forgeEntry) throw new Error(`No Forge versions found for Minecraft ${minecraftVersion}`);

        const latestForge = forgeEntry.forge[forgeEntry.forge.length - 1];
        const { forgeVersion } = loader_ver ? { forgeVersion: loader_ver } : await inquirer.prompt({
            type: 'list',
            name: 'forgeVersion',
            message: '🧱 Select Forge version:',
            choices: forgeEntry.forge,
            default: latestForge
        });

        const jarUrl = getForgeInstallerJarUrl(forgeVersion);
        const jarName = `forge-${forgeVersion}-installer.jar`;
        const jarPath = path.join(INSTALLER_DIR, jarName);

        cleanDir(INSTALLER_DIR);
        ensureDir(INSTALLER_DIR);

        spinner.start('📥 Downloading Forge installer...');
        spinner.stop();
        await downloader(jarUrl, jarPath);

        waitForFolder(metadata, minecraftVersion).then(versionFolder => {
            const profileManager = new LauncherProfileManager();
            const versionId = path.basename(versionFolder);
            profileManager.addProfile(versionId, minecraftVersion, versionId, metadata, versionId, metadata.name);
        })
        
        spinner.text = '🚀 Running Forge installer...';
        spinner.stop();
        await executeJar(jarPath, ['--installClient']);

        spinner.text = 'Cleaning caches';
        await cleanAfterInstall(INSTALLER_DIR);

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

    } catch (err: any) {
        spinner.fail('❌ Forge installation failed.');
        logger.error(err.message || err);
        return null;
    }
}

// Run if invoked directly
if (require.main === module) {
    installForgeViaExecutor();
}

export default {
    metadata,
    get: installForgeViaExecutor,
};