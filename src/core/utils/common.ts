import fs, { copyFileSync, rename, unlinkSync, writeFile } from "fs-extra";
import envPaths from "../tools/envs";
import path, { join } from "path";
import chokidar from "chokidar";
import { Metadata } from "../../types/launcher";
import { platform } from "os";
import pLimit, { LimitFunction } from "p-limit";
import { logger, progress } from "../game/launch/handler";
import * as tar from 'tar';
import LauncherProfileManager from "../tools/launcher";
import LauncherOptionsManager from "../game/launch/options";
import { readdir, rm, unlink } from "fs/promises";
import AdmZip from "adm-zip";
import { logPopupError } from "../tools/logger";
import zlib from "zlib";
import { Readable, Transform } from "stream";
import { _temp_safe } from "./download";
import { pipeline } from "stream/promises";
import { promisify } from "util";

export function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function cleanDir(dir: string) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

export function moveFileSync(oldPath: string, newPath: string) {
    copyFileSync(oldPath, newPath);
    unlinkSync(oldPath);
}

export function localpath(isCache: boolean = false) {
    let folder = isCache ? envPaths('Origami-Cache').temp : envPaths('Origami-Data').data;

    ensureDir(folder);
     
    return folder;
};

export function minecraft_dir(origami_data?: boolean) {
    let mc = envPaths('.minecraft').config;

    ensureDir(mc);
    ensureDir(path.join(mc, "versions"));

    if(origami_data) {
        let data = path.join(localpath(), '.data');
        ensureDir(data);
        return data;
    }

    return mc;
};

let _isSyncing = false;

export function sync_minecraft_data_dir(version: string, options?: boolean) {
    if (_isSyncing) return minecraft_dir();
    _isSyncing = true;

    try {
        const rootDir = minecraft_dir();
        const mc = path.join(rootDir, 'versions', version);
        const data = path.join(mc, 'data');

        const profile_manager = new LauncherProfileManager();
        const settings = new LauncherOptionsManager();

        const current_profile = profile_manager.getSelectedProfile();
        settings.setProfile(current_profile);

        if (settings.getFixedOptions().universal_game_dir && !options) {
            return rootDir;
        }

        ensureDir(mc);
        ensureDir(data);

        return data;
    } finally {
        _isSyncing = false;
    }
}

export async function async_minecraft_data_dir(version: string): Promise<string> {
    const newDir = sync_minecraft_data_dir(version);
    const legacyDir = path.join(minecraft_dir(), 'origami_files', 'instances', version);

    if (!(await fs.pathExists(legacyDir))) {
        return newDir;
    }

    const files = await collectFiles(legacyDir);
    const progress = logger.progress();
    const task = progress.create(`Migrating ${version}`, files.length);
    progress.start();

    await fs.ensureDir(newDir);

    for (let i = 0; i < files.length; i++) {
        const relPath = path.relative(legacyDir, files[i]);
        const destPath = path.join(newDir, relPath);

        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(files[i], destPath);
        task?.increment();
    }

    await fs.remove(legacyDir);
    task?.stop(false);
    logger.success(`Migration complete for version ${version}.`);

    return newDir;
}

export async function collectFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const nested = await collectFiles(fullPath);
            files.push(...nested);
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

export function printVersion () {
    let package_json = path.join(__dirname, '..', '..', '..', 'package.json');
    if (fs.existsSync(package_json)) {
        const { version } = JSON.parse(fs.readFileSync(package_json, { encoding: "utf-8" }));
        return version;
    } else { return "LATEST" }
}

export function waitForFolder(metadata: Metadata, id: string) {
    const versionsDir = path.join(minecraft_dir(), 'versions');
    
    function watchForVersion(version: string, onFound: (versionFolder: string) => void) {
        const watcher = chokidar.watch(versionsDir, {
            depth: 1,
            ignoreInitial: true,
        });

        watcher.on('addDir', (newPath) => {
            const name = path.basename(newPath).toLowerCase();
            if (name.includes(version.toLowerCase()) && name.includes(metadata.name.toLowerCase())) {
                watcher.close();
                onFound(newPath);
            }
        });
    }

    return new Promise<string>((resolve) => {
        watchForVersion(id, (versionFolder) => {
            console.log(`📁 Detected ${metadata.name} version folder: ${versionFolder}`);
            resolve(versionFolder);
        });
    });
}

export function valid_string(input: any) {
    return typeof input === 'string';
}

export function valid_boolean(input: any) {
    return typeof input === 'boolean';
}

export function parse_input(input: string | boolean | string[]): string | boolean {
    if(valid_boolean(input)) return input;
    else if(valid_string(input)) return input;

    return input.join(' ');
}

export function getSafeConcurrencyLimit(): number {
    const platform_ = platform();
    
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

export async function limitedAll<T>(
    tasks: (() => Promise<T>)[] | Promise<T>[],
    limit: LimitFunction = pLimit(getSafeConcurrencyLimit())
): Promise<T[]> {
    const wrappedTasks = tasks.map(task =>
        typeof task === 'function' ? limit(task) : limit(() => task)
    );

    return Promise.all(wrappedTasks);
}

export async function moveFolderContents(srcFolder: string, destFolder: string) {
    const entries = await fs.readdir(srcFolder);
    for (const entry of entries) {
        const srcPath = path.join(srcFolder, entry);
        const destPath = path.join(destFolder, entry);
        await fs.move(srcPath, destPath, { overwrite: true });
    }
}

export function sanitizePathSegment(input: string): string {
  return input
    .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '_') 
    .replaceAll(/\s+/g, '_')
    .replaceAll(' ', '_')
    .trim();
}

export function jsonParser(str: string) {
    try {
        return JSON.parse(str);
    } catch(_) {
        return {};
    }
}

export async function cleanAfterInstall(dir: string) {
    await new Promise((res) => setTimeout(res, 100));

    let mc = await readdir(minecraft_dir(), { withFileTypes: true });
    let logs = mc.filter(v => !v.isDirectory() && v.name.endsWith('.log'));

    await rm(dir, { recursive: true, force: true });
    await Promise.all(logs.map(async(log) => {
        let log_path = path.join(minecraft_dir(), log.name);
        let logs_path = path.join(minecraft_dir(), 'logs');
        ensureDir(logs_path);

        return await rename(log_path, path.join(logs_path, log.name));
    }));
}

export async function extractZip(zip_file: string, target: string) {
    try {
        const zip = new AdmZip(zip_file);
        const entries = zip.getEntries();
        
        let start = false;
        const prog = progress.create(`${path.basename(zip_file)}`, entries.length, true);

        for (const entry of entries) {
            if(!start) {
                progress.start();
                start = true;
            }

            const dest = path.join(target, entry.entryName);

            if(entry.isDirectory) {
                ensureDir(dest);
                prog?.increment();
                continue;
            }

            let data = await new Promise<Buffer>((res, rej) => entry.getDataAsync((data, err) => {
                if(err) return rej(new Error(err));
                res(data);
            }));

            ensureDir(path.dirname(dest));
            await writeFile(dest, data);

            prog?.increment();
        }

        progress.stopAll();
        return;
    } catch (e) {
        await logPopupError('Extraction Error', `🌸 Uh-oh! Something went wrong while unpacking your files:\n${(e as Error).message}`, true);
        return;
    }
}

function isGzipped(file: string) {
    return file.endsWith(".tar.gz") || file.endsWith(".tgz");
}

export async function extractTar(tarFile: string, target: string) {
    try {
        ensureDir(target);
        const gzip = isGzipped(tarFile);

        let tarPath = tarFile;
        let entries: string[] = [];

        await tar.t({
            file: tarPath,
            gzip,
            onentry: (entry) => { entries.push(entry.path) },
            onwarn(code, message, data) {
                logger.warn(`[TAR WARN] (${code}) - ${message} - Tar Code: ${data.tarCode || '<unknown>'} - File: ${data.file || '<unknown>'}`)
            },
        });

        let start = false;
        const prog = progress.create(`${path.basename(tarFile)}`, entries.length, true);

        await tar.x({
            file: tarPath,
            cwd: target,
            gzip,
            onentry: () => {
                if(!start) {
                    progress.start();
                    start = true;
                }

                prog?.increment();
            },
            onwarn(code, message, data) {
                logger.warn(`[TAR WARN] (${code}) - ${message} - Tar Code: ${data.tarCode || '<unknown>'} - File: ${data.file || '<unknown>'}`)
            },
        })

        progress.stopAll();
        return;
    } catch (e) {
        await logPopupError(
            'Extraction Error',
            `🌸 Uh-oh! Something went wrong while unpacking your files:\n${(e as Error).message}`,
            true
        );
        return;
    }
}