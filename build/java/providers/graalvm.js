"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graalvmProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const defaults_1 = require("../../config/defaults");
exports.graalvmProvider = {
    name: 'GraalVM',
    withJre: false,
    async listVersions() {
        const res = await axios_1.default.get('https://api.github.com/repos/graalvm/graalvm-ce-builds/releases', {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': defaults_1.ORIGAMi_USER_AGENT
            }
        });
        const versions = res.data
            .map((release) => release.tag_name)
            .filter((tag) => tag.startsWith('jdk-'))
            .map((tag) => `GraalVM ${tag}`);
        const sorted = versions.sort((a, b) => {
            const extractVersion = (str) => str.replace('GraalVM jdk-', '').split('.').map(n => parseInt(n, 10));
            const [aMajor, aMinor, aPatch] = extractVersion(a);
            const [bMajor, bMinor, bPatch] = extractVersion(b);
            if (aMajor !== bMajor)
                return bMajor - aMajor;
            if (aMinor !== bMinor)
                return bMinor - aMinor;
            return bPatch - aPatch;
        });
        return sorted;
    },
    async getBinary(version, os, arch, imageType) {
        const tag = version.replace('GraalVM ', '');
        const res = await axios_1.default.get(`https://api.github.com/repos/graalvm/graalvm-ce-builds/releases/tags/${tag}`, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': defaults_1.ORIGAMi_USER_AGENT
            }
        });
        const assets = res.data.assets;
        const platformFragment = (() => {
            const osMap = {
                linux: 'linux',
                mac: 'macos',
                windows: 'windows'
            };
            const archMap = {
                x64: 'x64',
                aarch64: 'aarch64'
            };
            return `${osMap[os]}-${archMap[arch]}`;
        })();
        const ext = os === 'windows' ? '.zip' : '.tar.gz';
        const asset = assets.find((a) => typeof a.name === 'string' && a.name.includes(platformFragment) && a.name.includes(tag) && a.name.endsWith(ext));
        if (!asset)
            throw new Error(`No GraalVM binary found for ${platformFragment} 😢`);
        return {
            name: asset.name,
            link: asset.browser_download_url
        };
    }
};
//# sourceMappingURL=graalvm.js.map