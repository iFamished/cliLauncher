import axios from 'axios';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { askForVersion, fetchMinecraftVersionManifest } from '../../../utils/minecraft_versions';
import { downloader } from '../../../utils/download';
import { ensureDir, cleanDir, localpath, minecraft_dir, waitForFolder, cleanAfterInstall } from '../../../utils/common';
import { run as executeJar } from '../../../tools/executor';
import { ClientJar } from '../../../../types/client';
import LauncherProfileManager from '../../../tools/launcher';
import { logger } from '../../launch/handler';
import { isMinecraftVersionInstalled, installVanillaHelper } from '../vanilla';

const metadata = {
    name: 'Fabric',
    description: 'A lightweight, experimental modding toolchain for Minecraft.',
    author: 'FabricMC'
};

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const FABRIC_MAVEN = `https://maven.fabricmc.net`;
const INSTALLER_DIR = path.join(localpath(true), 'fabric-client');

async function getLatestInstaller(): Promise<string> {
    const res = await axios.get(`${FABRIC_META}/versions/installer`);
    const latest = res.data.find((v: any) => v.stable);
    return latest.version;
}

async function getAvailableLoaders(): Promise<string[]> {
    const res = await axios.get(`${FABRIC_META}/versions/loader`);
    return res.data.map((v: any) => v.version);
}

async function getInstallerJarUrl(installerVersion: string): Promise<string> {
    return `${FABRIC_MAVEN}/net/fabricmc/fabric-installer/${installerVersion}/fabric-installer-${installerVersion}.jar`;
}

export async function installFabricViaExecutor(version?: string, loader_ver?: string): Promise<ClientJar | null> {
    const spinner = ora('🧵 Preparing Fabric installation...').start();

    try {
        const manifest = await fetchMinecraftVersionManifest();
        const latestMC = manifest.latest.release;

        spinner.stop()

        const minecraftVersion = version || await askForVersion(manifest.versions, latestMC);

        spinner.stop();
        const isVanillaInstalled = isMinecraftVersionInstalled(minecraftVersion);
        if (!isVanillaInstalled) {
            await installVanillaHelper(minecraftVersion);
        }

        const loaderVersions = await getAvailableLoaders();
        const { loaderVersion } = loader_ver ? { loaderVersion: loader_ver } : await inquirer.prompt([
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
        const jarName = `fabric-installer-${installerVersion}.jar`
        const jarPath = path.join(INSTALLER_DIR, jarName);

        cleanDir(INSTALLER_DIR);
        ensureDir(INSTALLER_DIR);

        spinner.text = '📦 Downloading Fabric installer...';
        spinner.stop();

        await downloader(jarUrl, jarPath);

        spinner.text = '🚀 Executing Fabric installer...';

        waitForFolder(metadata, minecraftVersion).then(versionFolder => {
            const profileManager = new LauncherProfileManager();
            const versionId = path.basename(versionFolder);
            profileManager.addProfile(versionId, minecraftVersion, versionId, metadata, versionId, metadata.name);
        })

        spinner.stop();
        await executeJar(jarPath, [
            'client',
            `-snapshot`,
            `-dir`, minecraft_dir(),
            `-mcversion`, minecraftVersion,
            `-loader`, loaderVersion
        ]);

        spinner.text = 'Cleaning caches';
        await cleanAfterInstall(INSTALLER_DIR);
        
        spinner.succeed('🎉 Fabric installed successfully!');

        return {
            name: metadata.name,
            version: minecraftVersion,
            url: jarUrl,
            client: { dir: INSTALLER_DIR, jar: jarName }
        };
    } catch (err: any) {
        spinner.fail('❌ Failed to install Fabric.');
        logger.error(err.message || err);
        return null;
    }
}

// Run if invoked directly
if (require.main === module) {
    installFabricViaExecutor();
}

export default {
    metadata,
    get: installFabricViaExecutor,
};