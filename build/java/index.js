"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
//import axios from 'axios';
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const tar = __importStar(require("tar"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const download_1 = require("../core/utils/download");
const common_1 = require("../core/utils/common");
const data_manager = __importStar(require("../core/tools/data_manager"));
//const API_BASE = 'https://api.adoptium.net/v3';
function detectOS() {
    const platform = os.platform();
    switch (platform) {
        case 'linux': return 'linux';
        case 'darwin': return 'mac';
        case 'win32': return 'windows';
        default: throw new Error(`Oops! Unsupported platform: ${platform} 🥺`);
    }
}
function detectArch() {
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
async function extractArchive(filePath, outputDir) {
    const isZip = filePath.endsWith('.zip');
    const isTarGz = filePath.endsWith('.tar.gz');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    if (isZip) {
        const zip = new adm_zip_1.default(filePath);
        zip.extractAllTo(outputDir, true);
    }
    else if (isTarGz) {
        await tar.x({
            file: filePath,
            cwd: outputDir
        });
    }
    else {
        throw new Error('Uh-oh! Unsupported archive format 😿');
    }
}
const temurin_1 = require("./providers/temurin");
const graalvm_1 = require("./providers/graalvm");
const zulu_1 = require("./providers/zulu");
const corretto_1 = require("./providers/corretto");
const providers = [temurin_1.temurinProvider, graalvm_1.graalvmProvider, zulu_1.zuluProvider, corretto_1.correttoProvider];
async function main() {
    const { providerName } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'providerName',
            message: '🌐 Select your Java distribution source:',
            choices: providers.map(p => p.name)
        }
    ]);
    const provider = providers.find(p => p.name === providerName);
    const osDetected = detectOS();
    const archDetected = detectArch();
    const versions = await provider.listVersions();
    const { version, imageType } = await inquirer_1.default.prompt([
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
    const downloadSpinner = (0, ora_1.default)('🔍 Fetching your binary info... hold tight...').start();
    let pkg;
    try {
        pkg = await provider.getBinary(version, osDetected, archDetected, imageType);
        downloadSpinner.succeed('✨ Got your binary info! Let\'s proceed! ✨');
    }
    catch (err) {
        downloadSpinner.fail('😿 Failed to get the binary info, sorry!');
        console.error(err.message);
        return;
    }
    const fileName = pkg.name;
    const downloadPath = path.join((0, common_1.localpath)(true), fileName);
    const LOCAL_PATH = (0, common_1.localpath)();
    const binariesPath = path.join(LOCAL_PATH, 'binaries');
    const extractPath = path.join(binariesPath, fileName);
    (0, common_1.ensureDir)(binariesPath);
    (0, common_1.ensureDir)(extractPath);
    (0, common_1.ensureDir)((0, common_1.localpath)(true));
    console.log(`\n🌟 Downloading ${fileName} with love... 🌟\n`);
    try {
        await (0, download_1.downloader)(pkg.link, downloadPath);
        console.log(`\n🎀 Download finished! 🎀\n`);
    }
    catch (err) {
        console.error(`😿 Download failed: ${err.message}`);
        return;
    }
    const extractSpinner = (0, ora_1.default)(`🎁 Unwrapping your package into ./binaries ...`).start();
    try {
        await extractArchive(downloadPath, extractPath);
        await fs.promises.rm(downloadPath, { recursive: true, force: true });
        const providerTagPath = path.join(extractPath, '.provider');
        await fs.promises.writeFile(providerTagPath, provider.name, 'utf-8');
        extractSpinner.succeed('🎉 Extraction complete! Your JDK is ready to use! 🎉');
    }
    catch (err) {
        extractSpinner.fail('😿 Extraction failed. Something went wrong!');
        console.error(err.message);
    }
}
/// --- SEPERATOR --- ///
const BANNER = `
╔════════════════════════════════════╗
║                                    ║
║   🎁  ${chalk_1.default.cyanBright('Java Binary Selector')}  🎁     ║
║                                    ║
╚════════════════════════════════════╝
`;
async function selectJavaBinary(use_new, profileName) {
    console.log(BANNER);
    const basePath = (0, common_1.localpath)();
    const spinner = (0, ora_1.default)({
        text: `${chalk_1.default.yellow('Scanning for Java installations...')}`,
        spinner: 'dots',
        color: 'cyan'
    }).start();
    const extractPath = path.join(basePath, 'binaries');
    const javaInstallations = findJavaInstallations(extractPath);
    spinner.stop();
    const profileKey = profileName ? `profile:${profileName}:java` : 'use:temurin';
    let savedJava = data_manager.get(profileKey);
    if (!savedJava && profileName) {
        savedJava = data_manager.get('use:temurin');
    }
    if (!data_manager.get(profileKey) && profileName && savedJava) {
        console.log(chalk_1.default.yellow(`⚠️  No specific Java selected for "${profileName}". Using global Java.`));
    }
    function logUse(java) {
        console.log(chalk_1.default.green(`\n✅ Selected: ${chalk_1.default.cyan(java.version || 'Java')} ${chalk_1.default.gray(`from ${chalk_1.default.yellow(java.provider || 'Unknown')}`)}`));
        console.log(chalk_1.default.gray(`📁 Path: ${java.path}\n`));
    }
    if (savedJava && !use_new && fs.existsSync(savedJava.path)) {
        logUse(savedJava);
        return savedJava;
    }
    if (javaInstallations.length === 0) {
        console.log(chalk_1.default.yellow('⚠️ No managed Java installations found. You can still use a custom path or JAVA_HOME.\n'));
    }
    const { selectedJava } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'selectedJava',
            message: chalk_1.default.hex('#FFA500')(`✨ Select Java binary${profileName ? ` for profile "${profileName}"` : ''}:`),
            choices: [
                ...javaInstallations.map(java => ({
                    name: `${chalk_1.default.cyan(java.version || 'Unknown')} ${chalk_1.default.gray(`from ${chalk_1.default.yellow(java.provider || 'Unknown')}, ${java.path}`)}`,
                    value: java
                })),
                new inquirer_1.default.Separator(),
                {
                    name: chalk_1.default.magenta('🔧 Use JAVA_HOME or enter custom Java path...'),
                    value: 'custom'
                }
            ],
            pageSize: Math.min(10, javaInstallations.length + 2),
            loop: false
        }
    ]);
    let selected;
    if (selectedJava === 'custom') {
        let customPath = process.env.JAVA_HOME
            ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
            : '';
        if (!customPath || !fs.existsSync(customPath)) {
            const { javaPath } = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'javaPath',
                    message: chalk_1.default.cyan('📍 JAVA_HOME not set. Enter the full path to your Java installation:'),
                    validate: (input) => {
                        const trimmed = input.trim().replace(/^['"]|['"]$/g, '');
                        const binJava = path.join(trimmed, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
                        if (!fs.existsSync(trimmed)) {
                            return '❌ That path does not exist.';
                        }
                        if (!fs.statSync(trimmed).isDirectory()) {
                            return '❌ That path is not a directory.';
                        }
                        if (!fs.existsSync(binJava)) {
                            return `❌ No Java executable found at: ${chalk_1.default.gray(binJava)}`;
                        }
                        return true;
                    },
                    filter: (input) => input.trim().replace(/^['"]|['"]$/g, '')
                }
            ]);
            customPath = path.join(javaPath, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
        }
        selected = {
            path: customPath,
            version: 'Custom',
            provider: 'manual'
        };
        let custom_installations = !Array.isArray(data_manager.get('custom:java')) ? [] : data_manager.get('custom:java');
        custom_installations.push(selected);
        data_manager.set('custom:java', custom_installations);
    }
    else {
        selected = selectedJava;
    }
    logUse(selected);
    data_manager.set(profileName ? `profile:${profileName}:java` : 'use:temurin', selected);
    data_manager.set(`use:temurin`, selected);
    return selected;
}
function findJavaInstallations(basePath) {
    if (!fs.existsSync(basePath))
        return [];
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    const installations = [];
    const custom_installations = data_manager.get('custom:java');
    if (Array.isArray(custom_installations)) {
        for (const entry of custom_installations) {
            installations.push(entry);
        }
    }
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const outerDir = path.join(basePath, entry.name);
        const binDir = path.join(outerDir, 'bin');
        const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
        const javaPath = path.join(binDir, javaExe);
        const providerPath = path.join(outerDir, '.provider');
        const provider = fs.existsSync(providerPath)
            ? fs.readFileSync(providerPath, 'utf-8').trim()
            : undefined;
        if (fs.existsSync(javaPath)) {
            installations.push({
                path: javaPath,
                version: extractJavaVersion(entry.name),
                provider
            });
            continue;
        }
        const innerEntries = fs.readdirSync(outerDir, { withFileTypes: true });
        for (const inner of innerEntries) {
            if (!inner.isDirectory())
                continue;
            const innerDir = path.join(outerDir, inner.name);
            const innerBin = path.join(innerDir, 'bin');
            const innerJava = path.join(innerBin, javaExe);
            const innerProviderPath = path.join(outerDir, '.provider');
            const innerProvider = fs.existsSync(innerProviderPath)
                ? fs.readFileSync(innerProviderPath, 'utf-8').trim()
                : undefined;
            if (fs.existsSync(innerJava)) {
                installations.push({
                    path: innerJava,
                    version: extractJavaVersion(inner.name),
                    provider: innerProvider
                });
            }
        }
    }
    return installations;
}
function extractJavaVersion(folderName) {
    const versionMatch = folderName.match(/(jdk|jre)[-_]?(\d+(?:\.\d+)*)/i);
    if (versionMatch) {
        return `Java ${versionMatch[2]}`;
    }
    return undefined;
}
async function deleteJavaBinary() {
    console.log(BANNER);
    const basePath = (0, common_1.localpath)();
    const extractPath = path.join(basePath, 'binaries');
    const javaInstallations = findJavaInstallations(extractPath);
    if (javaInstallations.length === 0) {
        console.log(chalk_1.default.yellow('⚠️ No Java installations found to delete.'));
        return;
    }
    const { binariesToDelete } = await inquirer_1.default.prompt([
        {
            type: 'checkbox',
            name: 'binariesToDelete',
            message: chalk_1.default.redBright('🗑️ Select Java versions to delete:'),
            choices: javaInstallations.map(java => ({
                name: `${chalk_1.default.cyan(java.version || 'Unknown')} ${chalk_1.default.gray(`from ${chalk_1.default.yellow(java.provider || 'Unknown')}, ${java.path}`)}`,
                value: java
            })),
            pageSize: Math.min(10, javaInstallations.length),
            loop: false
        }
    ]);
    if (binariesToDelete.length === 0) {
        console.log(chalk_1.default.yellow('❎ No selections made. Aborting deletion.'));
        return;
    }
    for (const java of binariesToDelete) {
        if (java.provider === 'manual') {
            let custom_installations = Array.isArray(data_manager.get('custom:java')) ? data_manager.get('custom:java') : [];
            custom_installations = custom_installations.filter((v) => v.path !== java.path);
            data_manager.set('custom:java', custom_installations);
            console.log(chalk_1.default.green(`✅ Deleted from Database: ${chalk_1.default.gray(java.path)}`));
            continue;
        }
        ;
        const maybeLegacy = path.resolve(java.path, '..', '..');
        const maybeModern = path.resolve(java.path, '..', '..', '..');
        const deletePath = fs.existsSync(path.join(maybeLegacy, 'bin')) ? maybeLegacy : maybeModern;
        if (fs.existsSync(deletePath)) {
            try {
                await fs.promises.rm(deletePath, { recursive: true, force: true });
                console.log(chalk_1.default.green(`✅ Deleted: ${chalk_1.default.gray(deletePath)}`));
            }
            catch (err) {
                console.error(chalk_1.default.red(`❌ Failed to delete ${deletePath}: ${err.message}`));
            }
        }
    }
    console.log(chalk_1.default.blueBright('\n🧹 Cleanup complete.'));
}
exports.default = { download: main, select: selectJavaBinary, delete: deleteJavaBinary };
//# sourceMappingURL=index.js.map