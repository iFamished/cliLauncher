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
import { pathExists, unlinkSync } from 'fs-extra';

const metadata = {
    name: 'Quilt',
    description: 'A modular, community-driven mod loader for Minecraft.',
    author: 'QuiltMC',
};

const INSTALLER_BASE = 'https://maven.quiltmc.org/repository/release';
const INSTALLER_DIR = path.join(localpath(true), 'quilt-client');

async function getLatestInstallerVersion(): Promise<string> {
    const res = await axios.get(`${INSTALLER_BASE}/org/quiltmc/quilt-installer/maven-metadata.xml`);
    const match = res.data.match(/<latest>(.+?)<\/latest>/);
    if (!match) throw new Error('Failed to parse latest Quilt installer version');
    return match[1];
}

async function getAllLoaderVersions(): Promise<string[]> {
  const url = `${INSTALLER_BASE}/org/quiltmc/quilt-loader/maven-metadata.xml`;
  const res = await axios.get(url);
  const versionsMatch = res.data.match(/<versions>([\s\S]*?)<\/versions>/);
  if (!versionsMatch) throw new Error('Failed to locate versions element');
  const versionTags = versionsMatch[1].match(/<version>(.+?)<\/version>/g) || [];
  return versionTags.map((v: any) => v.replace(/<\/?version>/g, '').trim());
}

function getInstallerJarUrl(version: string): string {
    return `${INSTALLER_BASE}/org/quiltmc/quilt-installer/${version}/quilt-installer-${version}.jar`;
}

export async function installQuiltViaExecutor(version?: string, loader_ver?: string): Promise<ClientJar | null> {
    const spinner = ora('🧵 Preparing Quilt installation...').start();

    try {
        const manifest = await fetchMinecraftVersionManifest();
        const latestMC = manifest.latest.release;
        spinner.stop();

        const minecraftVersion = version || await askForVersion(manifest.versions, latestMC);

        spinner.stop();
        const isVanillaInstalled = isMinecraftVersionInstalled(minecraftVersion);
        if (!isVanillaInstalled) {
            await installVanillaHelper(minecraftVersion);
        }

        const installerVersion = await getLatestInstallerVersion();

        const loaderVersions = await getAllLoaderVersions();
        const { loaderVersion } = loader_ver ? { loaderVersion: loader_ver } : await inquirer.prompt([
          {
            type: 'list',
            name: 'loaderVersion',
            message: '🧷 Select Quilt Loader version:',
            choices: loaderVersions.reverse(),
          }
        ]);

        const jarUrl = getInstallerJarUrl(installerVersion);
        const jarName = `quilt-installer-${installerVersion}.jar`;
        const jarPath = path.join(INSTALLER_DIR, jarName);

        cleanDir(INSTALLER_DIR);
        ensureDir(INSTALLER_DIR);

        spinner.text = '📦 Downloading Quilt installer...';
        spinner.stop();
        
        await downloader(jarUrl, jarPath);

        waitForFolder(metadata, minecraftVersion).then(async(versionFolder) => {
            const profileManager = new LauncherProfileManager();
            const versionId = path.basename(versionFolder);

            const quiltJar = path.join(versionFolder, `${versionId}.jar`);
            if(await pathExists(quiltJar)) unlinkSync(quiltJar);
            
            profileManager.addProfile(versionId, minecraftVersion, versionId, metadata, versionId, metadata.name);
        })

        spinner.text = '🚀 Executing Quilt installer...';

        spinner.stop();
        await executeJar(jarPath, [
            'install', 'client', minecraftVersion, loaderVersion,
            `--install-dir=${minecraft_dir()}`
        ]);

        spinner.text = 'Cleaning caches';
        await cleanAfterInstall(INSTALLER_DIR);

        spinner.succeed('🎉 Quilt installed successfully!');

        return {
            name: metadata.name,
            version: minecraftVersion,
            url: jarUrl,
            client: { dir: INSTALLER_DIR, jar: jarName }
        };
    } catch (err: any) {
        spinner.fail('❌ Failed to install Quilt.');
        logger.error(err.message || err);
        return null;
    }
}

// Run if invoked directly
if (require.main === module) {
    installQuiltViaExecutor();
}

export default {
    metadata,
    get: installQuiltViaExecutor,
};