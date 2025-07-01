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
const axios_1 = __importDefault(require("axios"));
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const tar = __importStar(require("tar"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const download_1 = require("../utils/download");
const common_1 = require("../utils/common");
const data_manager = __importStar(require("./data_manager"));
const API_BASE = 'https://api.adoptium.net/v3';
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
async function getAvailableVersions() {
    const res = await axios_1.default.get(`${API_BASE}/info/available_releases`);
    return res.data.available_lts_releases.map((v) => `Temurin ${v} ✨`).reverse();
}
async function getBinary(version, os, arch, imageType) {
    const versionNum = version.replace('Temurin ', '').replace(' ✨', '');
    const res = await axios_1.default.get(`${API_BASE}/assets/feature_releases/${versionNum}/ga`, {
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
    if (!binaries.length)
        throw new Error('Oh no! No binary found for your selection 😢');
    return binaries[0].binary ? binaries[0].binary.package : binaries[0].binaries[0].package;
}
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
async function main() {
    const osDetected = detectOS();
    const archDetected = detectArch();
    console.log(`🐧 Detected OS: ${osDetected} 💻`);
    console.log(`🦾 Detected Architecture: ${archDetected} 🎉`);
    const spinner = (0, ora_1.default)('🌟 Fetching available versions... please wait... 🌟').start();
    const versions = await getAvailableVersions();
    spinner.succeed('🌈 Versions loaded! Ready for you! 🌈');
    const { version, imageType } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'version',
            message: '🌸 Pick your Temurin JDK version, pretty please:',
            choices: versions
        },
        {
            type: 'list',
            name: 'imageType',
            message: '🌼 Choose your image type:',
            choices: ['jdk', 'jre']
        }
    ]);
    const downloadSpinner = (0, ora_1.default)('🔍 Fetching your binary info... hold tight...').start();
    let pkg;
    try {
        pkg = await getBinary(version, osDetected, archDetected, imageType);
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
    const extractPath = path.join(LOCAL_PATH, 'binaries');
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
async function selectJavaBinary(use_new = false) {
    console.log(BANNER);
    const basePath = (0, common_1.localpath)();
    const spinner = (0, ora_1.default)({
        text: `${chalk_1.default.yellow('Scanning for Java installations...')}`,
        spinner: 'dots',
        color: 'cyan'
    }).start();
    try {
        const extractPath = path.join(basePath, 'binaries');
        const javaInstallations = findJavaInstallations(extractPath);
        if (javaInstallations.length === 0) {
            spinner.fail(chalk_1.default.red('No Java installations found!'));
            throw new Error('No Java folders found in binaries directory');
        }
        spinner.succeed(chalk_1.default.green(`Found ${javaInstallations.length} Java installations!`));
        if (javaInstallations.length === 1) {
            let selectedJava = javaInstallations[0];
            console.log(chalk_1.default.green(`\n✅ Selected: ${chalk_1.default.cyan(selectedJava.version || 'Java')}`));
            console.log(chalk_1.default.gray(`📁 Path: ${selectedJava.path}\n`));
            data_manager.set('use:temurin', selectedJava);
            return selectedJava;
        }
        let use_temurin = data_manager.get('use:temurin');
        if (use_temurin && !use_new && fs.existsSync(use_temurin.path)) {
            console.log(chalk_1.default.green(`\n✅ Selected: ${chalk_1.default.cyan(use_temurin.version || 'Java')}`));
            console.log(chalk_1.default.gray(`📁 Path: ${use_temurin.path}\n`));
            return use_temurin;
        }
        const { selectedJava } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'selectedJava',
                message: chalk_1.default.hex('#FFA500')('✨ Which Java version would you like to use?'),
                choices: javaInstallations.map(java => ({
                    name: `${chalk_1.default.cyan(java.version || 'Unknown version')} ${chalk_1.default.gray(`(${java.path})`)}`,
                    value: java
                })),
                pageSize: Math.min(10, javaInstallations.length),
                loop: false
            }
        ]);
        console.log(chalk_1.default.green(`\n✅ Selected: ${chalk_1.default.cyan(selectedJava.version || 'Java')}`));
        console.log(chalk_1.default.gray(`📁 Path: ${selectedJava.path}\n`));
        data_manager.set('use:temurin', selectedJava);
        return selectedJava;
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Error scanning Java installations!'));
        throw error;
    }
}
function findJavaInstallations(basePath) {
    if (!fs.existsSync(basePath))
        return [];
    const items = fs.readdirSync(basePath);
    const installations = [];
    for (const item of items) {
        const fullPath = path.join(basePath, item);
        if (!fs.statSync(fullPath).isDirectory())
            continue;
        const binPath = path.join(fullPath, 'bin');
        if (!fs.existsSync(binPath))
            continue;
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
function extractJavaVersion(folderName) {
    const versionMatch = folderName.match(/(jdk|jre)[-_]?(\d+(?:\.\d+)*)/i);
    if (versionMatch) {
        return `Java ${versionMatch[2]}`;
    }
    return undefined;
}
exports.default = { download: main, select: selectJavaBinary };
//# sourceMappingURL=temurin.js.map