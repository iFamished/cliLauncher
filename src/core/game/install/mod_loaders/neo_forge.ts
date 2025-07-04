import axios from 'axios';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { downloader } from '../../../utils/download';
import { ensureDir, cleanDir, localpath, waitForFolder } from '../../../utils/common';
import { run as executeJar } from '../../../tools/executor';
import { ClientJar } from '../../../../types/client';
import LauncherProfileManager from '../../../tools/launcher';
import { logger } from '../../launch/handler';

const metadata = {
    name: 'NeoForge',
    description: 'NeoForge Minecraft client installer',
    author: 'NeoForged Project',
    unstable: true,
    jvm: '--add-opens java.base/java.lang.invoke=ALL-UNNAMED',
};

const MAVEN_BASE = 'https://maven.neoforged.net/releases/net/neoforged';
const METADATA_URL = `${MAVEN_BASE}/neoforge/maven-metadata.xml`;

function getInstallerJarUrl(version: string): string {
    return `${MAVEN_BASE}/neoforge/${version}/neoforge-${version}-installer.jar`;
}

function extractMCVersionFromNeoForge(neoforgeVersion: string): string | null {
    // Match things like 20.2.31, 21.5.3-beta, etc.
    const match = neoforgeVersion.match(/^(\d+)\.(\d+)\.\d+(?:-.+)?$/);
    if (!match) return null;

    const [_, major, minor] = match;
    return `1.${major}.${minor}`;
}

async function fetchNeoForgeVersions(): Promise<string[]> {
    const res = await axios.get(METADATA_URL);
    const xml: string = res.data;
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m => m[1]);
    return versions;
}

async function mapMCtoNeoForge(): Promise<Record<string, string[]>> {
    const neoForgeVersions = await fetchNeoForgeVersions();
    const map: Record<string, string[]> = {};

    for (const version of neoForgeVersions) {
        const mcVersion = extractMCVersionFromNeoForge(version);
        if (!mcVersion) continue;

        if (!map[mcVersion]) map[mcVersion] = [];
        map[mcVersion].push(version);
    }

    for (const mcVersion in map) {
        map[mcVersion].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
    }

    return map;
}

const INSTALL_DIR = path.join(localpath(true), 'neoforge-client');

async function installNeoForgeViaExecutor(): Promise<ClientJar | null> {
    const spinner = ora('🛠️ Preparing NeoForge installation...').start();
    try {
        const allVersions = await fetchNeoForgeVersions();
        if (allVersions.length === 0) throw new Error('No NeoForge versions found');

        const mcMap = await mapMCtoNeoForge();
        const mcVersions = Object.keys(mcMap).sort();
        spinner.stop();

        const { mcVersion } = await inquirer.prompt({
            type: 'list',
            name: 'mcVersion',
            message: '🎮 Select Minecraft version:',
            choices: mcVersions,
            default: mcVersions[mcVersions.length - 1]
        });

        const neoChoices = mcMap[mcVersion];
        const defaultNeo = neoChoices[neoChoices.length - 1];

        const { neoVersion } = await inquirer.prompt({
            type: 'list',
            name: 'neoVersion',
            message: `🧱 Select NeoForge version for MC ${mcVersion}:`,
            choices: neoChoices,
            default: defaultNeo
        });

        const jarUrl = getInstallerJarUrl(neoVersion);
        const jarName = `neoforge-${neoVersion}-installer.jar`;
        const jarPath = path.join(INSTALL_DIR, jarName);

        cleanDir(INSTALL_DIR);
        ensureDir(INSTALL_DIR);

        spinner.start('📥 Downloading NeoForge installer...');
        spinner.stop();

        await downloader(jarUrl, jarPath);
        
        waitForFolder(metadata, neoVersion).then(versionFolder => {
            const profileManager = new LauncherProfileManager();
            const versionId = path.basename(versionFolder);
            profileManager.addProfile(versionId, mcVersion, versionId, metadata, versionId, metadata.name);
        })

        spinner.text = '🚀 Running NeoForge installer...';
        spinner.stop();
        await executeJar(jarPath, []);

        spinner.succeed('✅ NeoForge installed successfully!');
        return {
            name: metadata.name,
            version: `neoforge-${neoVersion}`,
            url: jarUrl,
            client: {
                dir: INSTALL_DIR,
                jar: jarName
            }
        };

    } catch (err: any) {
        spinner.fail('❌ Installation failed.');
        logger.error(err.message || err);
        return null;
    }
}

// Run if invoked directly
if (require.main === module) {
    installNeoForgeViaExecutor();
}

export default {
    metadata,
    get: installNeoForgeViaExecutor,
};
