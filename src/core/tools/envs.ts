
/// Credits to (env-paths => https://github.com/sindresorhus/env-paths)
/// envs.ts
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const homedir = os.homedir();
const tmpdir = os.tmpdir();
const {env} = process;

const macos = (name: string) => {
	const library = path.join(homedir, 'Library');

	return {
		data: path.join(library, 'Application Support', name),
		config: path.join(library, 'Preferences', name),
		cache: path.join(library, 'Caches', name),
		log: path.join(library, 'Logs', name),
		temp: path.join(tmpdir, name),
	};
};

const windows = (name: string) => {
	const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
	const localAppData = env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local');

	return {
		data: path.join(localAppData, name),
		config: path.join(appData, name),
		cache: path.join(tmpdir, name),
		log: path.join(localAppData, name),
		temp: path.join(tmpdir, name),
	};
};

// https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
const linux = (name: string) => {
	const username = path.basename(homedir);

	return {
		data: path.join(env.XDG_DATA_HOME || path.join(homedir, '.local', 'share'), name),
		config: path.join(env.XDG_CONFIG_HOME || path.join(homedir, '.config'), name),
		cache: path.join(env.XDG_CACHE_HOME || path.join(homedir, '.cache'), name),
		// https://wiki.debian.org/XDGBaseDirectorySpecification#state
		log: path.join(env.XDG_STATE_HOME || path.join(homedir, '.local', 'state'), name),
		temp: path.join(tmpdir, username, name),
	};
};

export default function envPaths(name: string) {
	if (typeof name !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof name}`);
	}

	if (process.platform === 'darwin') {
		return macos(name);
	}

	if (process.platform === 'win32') {
		return windows(name);
	}

	return linux(name);
}