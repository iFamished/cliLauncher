import fs, { copyFileSync, unlinkSync } from "fs";
import envPaths from "../tools/envs";
import path, { join } from "path";
import chokidar from "chokidar";
import { Metadata } from "../../types/launcher";

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
    return isCache ? envPaths('Origami-Cache').temp : envPaths('Origami-Data').data;
};

export function minecraft_dir() {
    let mc = envPaths('.minecraft').config;

    ensureDir(mc);
    ensureDir(path.join(mc, "versions"));

    return mc;
};

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