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
exports.ensureDir = ensureDir;
exports.cleanDir = cleanDir;
exports.moveFileSync = moveFileSync;
exports.localpath = localpath;
exports.minecraft_dir = minecraft_dir;
exports.sync_minecraft_data_dir = sync_minecraft_data_dir;
exports.async_minecraft_data_dir = async_minecraft_data_dir;
exports.collectFiles = collectFiles;
exports.printVersion = printVersion;
exports.waitForFolder = waitForFolder;
exports.valid_string = valid_string;
exports.valid_boolean = valid_boolean;
exports.parse_input = parse_input;
exports.getSafeConcurrencyLimit = getSafeConcurrencyLimit;
exports.limitedAll = limitedAll;
exports.moveFolderContents = moveFolderContents;
exports.sanitizePathSegment = sanitizePathSegment;
exports.jsonParser = jsonParser;
exports.cleanAfterInstall = cleanAfterInstall;
exports.extractZip = extractZip;
exports.extractTar = extractTar;
const fs_extra_1 = __importStar(require("fs-extra"));
const envs_1 = __importDefault(require("../tools/envs"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const os_1 = require("os");
const p_limit_1 = __importDefault(require("p-limit"));
const handler_1 = require("../game/launch/handler");
const tar = __importStar(require("tar"));
const launcher_1 = __importDefault(require("../tools/launcher"));
const options_1 = __importDefault(require("../game/launch/options"));
const promises_1 = require("fs/promises");
const adm_zip_1 = __importDefault(require("adm-zip"));
const logger_1 = require("../tools/logger");
function ensureDir(dir) {
    if (!fs_extra_1.default.existsSync(dir)) {
        fs_extra_1.default.mkdirSync(dir, { recursive: true });
    }
}
function cleanDir(dir) {
    if (fs_extra_1.default.existsSync(dir)) {
        fs_extra_1.default.rmSync(dir, { recursive: true, force: true });
    }
}
function moveFileSync(oldPath, newPath) {
    (0, fs_extra_1.copyFileSync)(oldPath, newPath);
    (0, fs_extra_1.unlinkSync)(oldPath);
}
function localpath(isCache = false) {
    let folder = isCache ? (0, envs_1.default)('Origami-Cache').temp : (0, envs_1.default)('Origami-Data').data;
    ensureDir(folder);
    return folder;
}
;
function minecraft_dir(origami_data) {
    let mc = (0, envs_1.default)('.minecraft').config;
    ensureDir(mc);
    ensureDir(path_1.default.join(mc, "versions"));
    if (origami_data) {
        let data = path_1.default.join(localpath(), '.data');
        ensureDir(data);
        return data;
    }
    return mc;
}
;
let _isSyncing = false;
function sync_minecraft_data_dir(version, options) {
    if (_isSyncing)
        return minecraft_dir();
    _isSyncing = true;
    try {
        const rootDir = minecraft_dir();
        const mc = path_1.default.join(rootDir, 'versions', version);
        const data = path_1.default.join(mc, 'data');
        const profile_manager = new launcher_1.default();
        const settings = new options_1.default();
        const current_profile = profile_manager.getSelectedProfile();
        settings.setProfile(current_profile);
        if (settings.getFixedOptions().universal_game_dir && !options) {
            return rootDir;
        }
        ensureDir(mc);
        ensureDir(data);
        return data;
    }
    finally {
        _isSyncing = false;
    }
}
async function async_minecraft_data_dir(version) {
    const newDir = sync_minecraft_data_dir(version);
    const legacyDir = path_1.default.join(minecraft_dir(), 'origami_files', 'instances', version);
    if (!(await fs_extra_1.default.pathExists(legacyDir))) {
        return newDir;
    }
    const files = await collectFiles(legacyDir);
    const progress = handler_1.logger.progress();
    const task = progress.create(`Migrating ${version}`, files.length);
    progress.start();
    await fs_extra_1.default.ensureDir(newDir);
    for (let i = 0; i < files.length; i++) {
        const relPath = path_1.default.relative(legacyDir, files[i]);
        const destPath = path_1.default.join(newDir, relPath);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(destPath));
        await fs_extra_1.default.copy(files[i], destPath);
        task?.increment();
    }
    await fs_extra_1.default.remove(legacyDir);
    task?.stop(false);
    handler_1.logger.success(`Migration complete for version ${version}.`);
    return newDir;
}
async function collectFiles(dir) {
    const entries = await fs_extra_1.default.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            const nested = await collectFiles(fullPath);
            files.push(...nested);
        }
        else {
            files.push(fullPath);
        }
    }
    return files;
}
function printVersion() {
    let package_json = path_1.default.join(__dirname, '..', '..', '..', 'package.json');
    if (fs_extra_1.default.existsSync(package_json)) {
        const { version } = JSON.parse(fs_extra_1.default.readFileSync(package_json, { encoding: "utf-8" }));
        return version;
    }
    else {
        return "LATEST";
    }
}
function waitForFolder(metadata, id) {
    const versionsDir = path_1.default.join(minecraft_dir(), 'versions');
    function watchForVersion(version, onFound) {
        const watcher = chokidar_1.default.watch(versionsDir, {
            depth: 1,
            ignoreInitial: true,
        });
        watcher.on('addDir', (newPath) => {
            const name = path_1.default.basename(newPath).toLowerCase();
            if (name.includes(version.toLowerCase()) && name.includes(metadata.name.toLowerCase())) {
                watcher.close();
                onFound(newPath);
            }
        });
    }
    return new Promise((resolve) => {
        watchForVersion(id, (versionFolder) => {
            console.log(`📁 Detected ${metadata.name} version folder: ${versionFolder}`);
            resolve(versionFolder);
        });
    });
}
function valid_string(input) {
    return typeof input === 'string';
}
function valid_boolean(input) {
    return typeof input === 'boolean';
}
function parse_input(input) {
    if (valid_boolean(input))
        return input;
    else if (valid_string(input))
        return input;
    return input.join(' ');
}
function getSafeConcurrencyLimit() {
    const platform_ = (0, os_1.platform)();
    switch (platform_) {
        case 'win32':
            return 32;
        case 'darwin':
            return 16;
        case 'linux':
            return 64;
        default:
            return 16;
    }
}
async function limitedAll(tasks, limit = (0, p_limit_1.default)(getSafeConcurrencyLimit())) {
    const wrappedTasks = tasks.map(task => typeof task === 'function' ? limit(task) : limit(() => task));
    return Promise.all(wrappedTasks);
}
async function moveFolderContents(srcFolder, destFolder) {
    const entries = await fs_extra_1.default.readdir(srcFolder);
    for (const entry of entries) {
        const srcPath = path_1.default.join(srcFolder, entry);
        const destPath = path_1.default.join(destFolder, entry);
        await fs_extra_1.default.move(srcPath, destPath, { overwrite: true });
    }
}
function sanitizePathSegment(input) {
    return input
        .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replaceAll(/\s+/g, '_')
        .replaceAll(' ', '_')
        .trim();
}
function jsonParser(str) {
    try {
        return JSON.parse(str);
    }
    catch (_) {
        return {};
    }
}
async function cleanAfterInstall(dir) {
    await new Promise((res) => setTimeout(res, 100));
    let mc = await (0, promises_1.readdir)(minecraft_dir(), { withFileTypes: true });
    let logs = mc.filter(v => !v.isDirectory() && v.name.endsWith('.log'));
    await (0, promises_1.rm)(dir, { recursive: true, force: true });
    await Promise.all(logs.map(async (log) => {
        let log_path = path_1.default.join(minecraft_dir(), log.name);
        let logs_path = path_1.default.join(minecraft_dir(), 'logs');
        ensureDir(logs_path);
        return await (0, fs_extra_1.rename)(log_path, path_1.default.join(logs_path, log.name));
    }));
}
async function extractZip(zip_file, target) {
    try {
        const zip = new adm_zip_1.default(zip_file);
        const entries = zip.getEntries();
        let start = false;
        const prog = handler_1.progress.create(`${path_1.default.basename(zip_file)}`, entries.length, true);
        for (const entry of entries) {
            if (!start) {
                handler_1.progress.start();
                start = true;
            }
            const dest = path_1.default.join(target, entry.entryName);
            if (entry.isDirectory) {
                ensureDir(dest);
                prog?.increment();
                continue;
            }
            let data = await new Promise((res, rej) => entry.getDataAsync((data, err) => {
                if (err)
                    return rej(new Error(err));
                res(data);
            }));
            ensureDir(path_1.default.dirname(dest));
            await (0, fs_extra_1.writeFile)(dest, data);
            prog?.increment();
        }
        handler_1.progress.stopAll();
        return;
    }
    catch (e) {
        await (0, logger_1.logPopupError)('Extraction Error', `🌸 Uh-oh! Something went wrong while unpacking your files:\n${e.message}`, true);
        return;
    }
}
function isGzipped(file) {
    return file.endsWith(".tar.gz") || file.endsWith(".tgz");
}
async function extractTar(tarFile, target) {
    try {
        ensureDir(target);
        const gzip = isGzipped(tarFile);
        let tarPath = tarFile;
        let entries = [];
        await tar.t({
            file: tarPath,
            gzip,
            onentry: (entry) => { entries.push(entry.path); },
            onwarn(code, message, data) {
                handler_1.logger.warn(`[TAR WARN] (${code}) - ${message} - Tar Code: ${data.tarCode || '<unknown>'} - File: ${data.file || '<unknown>'}`);
            },
        });
        let start = false;
        const prog = handler_1.progress.create(`${path_1.default.basename(tarFile)}`, entries.length, true);
        await tar.x({
            file: tarPath,
            cwd: target,
            gzip,
            onentry: () => {
                if (!start) {
                    handler_1.progress.start();
                    start = true;
                }
                prog?.increment();
            },
            onwarn(code, message, data) {
                handler_1.logger.warn(`[TAR WARN] (${code}) - ${message} - Tar Code: ${data.tarCode || '<unknown>'} - File: ${data.file || '<unknown>'}`);
            },
        });
        handler_1.progress.stopAll();
        return;
    }
    catch (e) {
        await (0, logger_1.logPopupError)('Extraction Error', `🌸 Uh-oh! Something went wrong while unpacking your files:\n${e.message}`, true);
        return;
    }
}
//# sourceMappingURL=common.js.map