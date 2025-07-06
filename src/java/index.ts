import inquirer from 'inquirer';
//import axios from 'axios';
import ora from 'ora';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as tar from 'tar';
import AdmZip from 'adm-zip';
import { downloader } from '../core/utils/download';
import { cleanDir, ensureDir, localpath } from '../core/utils/common';
import * as data_manager from "../core/tools/data_manager";

//const API_BASE = 'https://api.adoptium.net/v3';

function detectOS(): string {
    const platform = os.platform();
    switch (platform) {
        case 'linux': return 'linux';
        case 'darwin': return 'mac';
        case 'win32': return 'windows';
        default: throw new Error(`Oops! Unsupported platform: ${platform} 🥺`);
    }
}

function detectArch(): string {
    const arch = os.arch();
    switch (arch) {
        case 'x64': return 'x64';
        case 'arm64': return 'aarch64';
        default: throw new Error(`Oops! Unsupported architecture: ${arch} 😿`);
    }
}

/*async function getAvailableVersions(): Promise<string[]> {
    const res = await axios.get(`${API_BASE}/info/available_releases`);
    return res.data.available_lts_releases.map((v: number) => `Temurin ${v} ✨`).reverse();
}

async function getBinary(version: string, os: string, arch: string, imageType: string) {
    const versionNum = version.replace('Temurin ', '').replace(' ✨', '');
    const res = await axios.get(`${API_BASE}/assets/feature_releases/${versionNum}/ga`, {
        params: {
            architecture: arch,
            image_type: imageType,
            jvm_impl: 'hotspot',
            os: os,
            heap_size: 'normal',
            vendor: 'eclipse'
        }
    });

    const binaries = res.data;
    if (!binaries.length) throw new Error('Oh no! No binary found for your selection 😢');

    return binaries[0].binary ? binaries[0].binary.package : binaries[0].binaries[0].package;
}*/

async function extractArchive(filePath: string, outputDir: string) {
    const isZip = filePath.endsWith('.zip');
    const isTarGz = filePath.endsWith('.tar.gz');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    if (isZip) {
        const zip = new AdmZip(filePath);
        zip.extractAllTo(outputDir, true);
    } else if (isTarGz) {
        await tar.x({
            file: filePath,
            cwd: outputDir
        });
    } else {
        throw new Error('Uh-oh! Unsupported archive format 😿');
    }
}

interface JavaProvider {
    name: string;
    withJre: boolean;
    listVersions(): Promise<string[]>;
    getBinary(version: string, os: string, arch: string, imageType: string): Promise<{
        name: string;
        link: string;
    }>;
}

import { temurinProvider } from './providers/temurin';
import { graalvmProvider } from './providers/graalvm';
import { zuluProvider } from './providers/zulu';

const providers: JavaProvider[] = [temurinProvider, graalvmProvider, zuluProvider]

async function main() {
    const { providerName } = await inquirer.prompt([
        {
            type: 'list',
            name: 'providerName',
            message: '🌐 Select your Java distribution source:',
            choices: providers.map(p => p.name)
        }
    ]);
    const provider = providers.find(p => p.name === providerName)!;

    const osDetected = detectOS();
    const archDetected = detectArch();
    const versions = await provider.listVersions();

    const { version, imageType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'version',
            message: '🌸 Pick your version:',
            choices: versions
        },
        {
            type: 'list',
            name: 'imageType',
            message: '🌼 Choose your image type:',
            choices: provider.withJre ? ['jdk', 'jre'] : ['jdk']
        }
    ]);

    const downloadSpinner = ora('🔍 Fetching your binary info... hold tight...').start();
    let pkg;
    try {
        pkg = await provider.getBinary(version, osDetected, archDetected, imageType);
        downloadSpinner.succeed('✨ Got your binary info! Let\'s proceed! ✨');
    } catch (err: any) {
        downloadSpinner.fail('😿 Failed to get the binary info, sorry!');
        console.error(err.message);
        return;
    }

    const fileName = pkg.name;
    const downloadPath = path.join(localpath(true), fileName);
    const LOCAL_PATH = localpath();
    const extractPath = path.join(LOCAL_PATH, 'binaries');

    ensureDir(extractPath);
    ensureDir(localpath(true));

    console.log(`\n🌟 Downloading ${fileName} with love... 🌟\n`);
    try {
        await downloader(pkg.link, downloadPath);
        console.log(`\n🎀 Download finished! 🎀\n`);
    } catch (err: any) {
        console.error(`😿 Download failed: ${err.message}`);
        return;
    }

    const extractSpinner = ora(`🎁 Unwrapping your package into ./binaries ...`).start();
    try {
        await extractArchive(downloadPath, extractPath);
        await fs.promises.rm(downloadPath, { recursive: true, force: true });
        extractSpinner.succeed('🎉 Extraction complete! Your JDK is ready to use! 🎉');
    } catch (err: any) {
        extractSpinner.fail('😿 Extraction failed. Something went wrong!');
        console.error(err.message);
    }
}

/// --- SEPERATOR --- ///

const BANNER = `
╔════════════════════════════════════╗
║                                    ║
║   🎁  ${chalk.cyanBright('Java Binary Selector')}  🎁     ║
║                                    ║
╚════════════════════════════════════╝
`;

interface JavaBinary {
    path: string;
    version?: string;
}

async function selectJavaBinary(use_new: boolean = false): Promise<JavaBinary> {
    console.log(BANNER);
    
    const basePath = localpath();
    const spinner = ora({
        text: `${chalk.yellow('Scanning for Java installations...')}`,
        spinner: 'dots',
        color: 'cyan'
    }).start();

    try {
        const extractPath = path.join(basePath, 'binaries');
        const javaInstallations = findJavaInstallations(extractPath);

        if (javaInstallations.length === 0) {
            spinner.fail(chalk.red('No Java installations found!'));
            throw new Error('No Java folders found in binaries directory');
        }

        spinner.succeed(chalk.green(`Found ${javaInstallations.length} Java installations!`));

        if(javaInstallations.length === 1) {
            let selectedJava = javaInstallations[0];

            console.log(chalk.green(`\n✅ Selected: ${chalk.cyan(selectedJava.version || 'Java')}`));
            console.log(chalk.gray(`📁 Path: ${selectedJava.path}\n`));

            data_manager.set('use:temurin', selectedJava);
            return selectedJava;
        }

        let use_temurin = data_manager.get('use:temurin');
        if(use_temurin && !use_new && fs.existsSync(use_temurin.path)) {
            console.log(chalk.green(`\n✅ Selected: ${chalk.cyan(use_temurin.version || 'Java')}`));
            console.log(chalk.gray(`📁 Path: ${use_temurin.path}\n`));

            return use_temurin;
        }

        const { selectedJava } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedJava',
                message: chalk.hex('#FFA500')('✨ Which Java version would you like to use?'),
                choices: javaInstallations.map(java => ({
                    name: `${chalk.cyan(java.version || 'Unknown version')} ${chalk.gray(`(${java.path})`)}`,
                    value: java
                })),
                pageSize: Math.min(10, javaInstallations.length),
                loop: false
            }
        ]);

        console.log(chalk.green(`\n✅ Selected: ${chalk.cyan(selectedJava.version || 'Java')}`));
        console.log(chalk.gray(`📁 Path: ${selectedJava.path}\n`));

        data_manager.set('use:temurin', selectedJava);
        return selectedJava;
    } catch (error) {
        spinner.fail(chalk.red('Error scanning Java installations!'));
        throw error;
    }
}

function findJavaInstallations(basePath: string): JavaBinary[] {
    if (!fs.existsSync(basePath)) return [];
    
    const items = fs.readdirSync(basePath);
    const installations: JavaBinary[] = [];

    for (const item of items) {
        const fullPath = path.join(basePath, item);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        const binPath = path.join(fullPath, 'bin');
        if (!fs.existsSync(binPath)) continue;

        const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
        const javaPath = path.join(binPath, javaExecutable);

        if (fs.existsSync(javaPath)) {
            installations.push({
                path: javaPath,
                version: extractJavaVersion(item)
            });
        }
    }

    return installations;
}

function extractJavaVersion(folderName: string): string | undefined {
    const versionMatch = folderName.match(/(jdk|jre)[-_]?(\d+(?:\.\d+)*)/i);
    if (versionMatch) {
        return `Java ${versionMatch[2]}`;
    }
    return undefined;
}

async function deleteJavaBinary(): Promise<void> {
    console.log(BANNER);

    const basePath = localpath();
    const extractPath = path.join(basePath, 'binaries');
    const javaInstallations = findJavaInstallations(extractPath);

    if (javaInstallations.length === 0) {
        console.log(chalk.yellow('⚠️ No Java installations found to delete.'));
        return;
    }

    const { binariesToDelete } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'binariesToDelete',
            message: chalk.redBright('🗑️ Select Java versions to delete:'),
            choices: javaInstallations.map(java => ({
                name: `${chalk.cyan(java.version || 'Unknown')} ${chalk.gray(`(${java.path})`)}`,
                value: java.path
            })),
            pageSize: Math.min(10, javaInstallations.length),
            loop: false
        }
    ]);

    if (binariesToDelete.length === 0) {
        console.log(chalk.yellow('❎ No selections made. Aborting deletion.'));
        return;
    }

    for (const javaPath of binariesToDelete) {
        const installDir = path.resolve(javaPath, '..', '..');
        if (fs.existsSync(installDir)) {
            try {
                await fs.promises.rm(installDir, { recursive: true, force: true });
                console.log(chalk.green(`✅ Deleted: ${chalk.gray(installDir)}`));
            } catch (err: any) {
                console.error(chalk.red(`❌ Failed to delete ${installDir}: ${err.message}`));
            }
        }
    }

    console.log(chalk.blueBright('\n🧹 Cleanup complete.'));
}

export default { download: main, select: selectJavaBinary, delete: deleteJavaBinary };