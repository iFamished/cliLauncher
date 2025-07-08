"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const ora_1 = __importDefault(require("ora"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const common_1 = require("../utils/common");
const download_1 = require("../utils/download");
const defaults_1 = require("../../config/defaults");
const RELEASE_INFO = 'release.json';
async function fetchAllReleases() {
    const url = 'https://api.github.com/repos/yushijinhun/authlib-injector/releases?per_page=100';
    const response = await axios_1.default.get(url, {
        headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'axios-client',
        },
    });
    return response.data;
}
async function get_authlib(server) {
    const spinner = (0, ora_1.default)('AuthLib: Fetching AuthLib').start();
    const authlibDir = path_1.default.join((0, common_1.localpath)(false), 'authlib');
    const jarPath = path_1.default.join(authlibDir, 'authlib-injector.jar');
    const releaseInfoPath = path_1.default.join(authlibDir, RELEASE_INFO);
    try {
        const releases = await fetchAllReleases();
        for (const release of releases) {
            const tag = release.tag_name;
            const matchingAsset = release.assets.find(asset => asset.name.endsWith('.jar') &&
                asset.name.toLowerCase().includes('authlib'));
            if (!matchingAsset)
                continue;
            const jarExists = fs_extra_1.default.existsSync(jarPath);
            const tagMatches = fs_extra_1.default.existsSync(releaseInfoPath) &&
                (await fs_extra_1.default.readJson(releaseInfoPath)).tag === tag;
            if (jarExists && tagMatches) {
                spinner.succeed(`AuthLib: Existing up-to-date injector found (${tag})`);
                return defaults_1.AUTHLIB_ARGS.replaceAll('$AUTH', `${jarPath}`).replaceAll('$SERVER', server);
            }
            spinner.text = `AuthLib: Downloading latest injector from ${tag}...`;
            (0, common_1.cleanDir)(authlibDir);
            (0, common_1.ensureDir)(authlibDir);
            spinner.stop();
            await (0, download_1.downloader)(matchingAsset.browser_download_url, jarPath);
            await fs_extra_1.default.writeJson(releaseInfoPath, { tag }, { spaces: 2 });
            spinner.succeed(`AuthLib: Downloaded and saved ${tag}`);
            return defaults_1.AUTHLIB_ARGS.replaceAll('$AUTH', `${jarPath}`).replaceAll('$SERVER', server);
        }
        spinner.fail('AuthLib: No suitable authlib-injector jar found in any release.');
        return '';
    }
    catch (error) {
        spinner.fail('AuthLib: Failed to fetch or download: ' + error.message);
        return '';
    }
}
exports.default = get_authlib;
//# sourceMappingURL=authlib.js.map