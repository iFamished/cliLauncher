import fs, { copyFileSync, unlinkSync } from "fs-extra";
import envPaths from "../tools/envs";
import path, { join } from "path";
import chokidar from "chokidar";
import { Metadata } from "../../types/launcher";
import { platform } from "os";
import pLimit, { LimitFunction } from "p-limit";
import { logger } from "../game/launch/handler";
import { get } from "../tools/data_manager";

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

export function sync_minecraft_data_dir(version: string, options?: boolean) {
    let mc = path.join(minecraft_dir(), 'versions', version);
    let data = path.join(mc, 'data');

    if(get('universal:dir') && !options) {
        return minecraft_dir();
    }

    ensureDir(mc);
    ensureDir(data);

    return data;
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

async function collectFiles(dir: string): Promise<string[]> {
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