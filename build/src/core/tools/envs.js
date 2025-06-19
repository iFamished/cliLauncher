"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = envPaths;
/// Credits to (env-paths => https://github.com/sindresorhus/env-paths)
/// envs.ts
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_process_1 = __importDefault(require("node:process"));
const homedir = node_os_1.default.homedir();
const tmpdir = node_os_1.default.tmpdir();
const { env } = node_process_1.default;
const macos = (name) => {
    const library = node_path_1.default.join(homedir, 'Library');
    return {
        data: node_path_1.default.join(library, 'Application Support', name),
        config: node_path_1.default.join(library, 'Preferences', name),
        cache: node_path_1.default.join(library, 'Caches', name),
        log: node_path_1.default.join(library, 'Logs', name),
        temp: node_path_1.default.join(tmpdir, name),
    };
};
const windows = (name) => {
    const appData = env.APPDATA || node_path_1.default.join(homedir, 'AppData', 'Roaming');
    const localAppData = env.LOCALAPPDATA || node_path_1.default.join(homedir, 'AppData', 'Local');
    return {
        data: node_path_1.default.join(localAppData, name),
        config: node_path_1.default.join(appData, name),
        cache: node_path_1.default.join(tmpdir, name),
        log: node_path_1.default.join(localAppData, name),
        temp: node_path_1.default.join(tmpdir, name),
    };
};
// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
const linux = (name) => {
    const username = node_path_1.default.basename(homedir);
    return {
        data: node_path_1.default.join(env.XDG_DATA_HOME || node_path_1.default.join(homedir, '.local', 'share'), name),
        config: node_path_1.default.join(env.XDG_CONFIG_HOME || node_path_1.default.join(homedir, '.config'), name),
        cache: node_path_1.default.join(env.XDG_CACHE_HOME || node_path_1.default.join(homedir, '.cache'), name),
        // https://wiki.debian.org/XDGBaseDirectorySpecification#state
        log: node_path_1.default.join(env.XDG_STATE_HOME || node_path_1.default.join(homedir, '.local', 'state'), name),
        temp: node_path_1.default.join(tmpdir, username, name),
    };
};
function envPaths(name) {
    if (typeof name !== 'string') {
        throw new TypeError(`Expected a string, got ${typeof name}`);
    }
    if (node_process_1.default.platform === 'darwin') {
        return macos(name);
    }
    if (node_process_1.default.platform === 'win32') {
        return windows(name);
    }
    return linux(name);
}
//# sourceMappingURL=envs.js.map