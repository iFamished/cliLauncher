"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zuluProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const defaults_1 = require("../../config/defaults");
exports.zuluProvider = {
    name: 'Zulu OpenJDK',
    withJre: true,
    async listVersions() {
        const res = await axios_1.default.get('https://api.azul.com/zulu/download/community/v1.0/bundles', {
            headers: {
                'User-Agent': defaults_1.ORIGAMi_USER_AGENT
            }
        });
        const versions = Array.from(new Set(res.data
            .filter((entry) => entry.java_version)
            .map((entry) => `Zulu ${entry.java_version}`)));
        const sorted = versions.sort((a, b) => {
            const ev = (s) => s.replace('Zulu ', '').split('.').map(x => parseInt(x, 10));
            const [aM, aN = 0, aP = 0] = ev(a), [bM, bN = 0, bP = 0] = ev(b);
            if (aM !== bM)
                return bM - aM;
            if (aN !== bN)
                return bN - aN;
            return bP - aP;
        });
        return sorted;
    },
    async getBinary(version, os, arch, imageType) {
        const java_version = version.replace('Zulu ', '');
        const osMap = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };
        const archMap = {
            x64: 'x86_64',
            aarch64: 'aarch64',
        };
        const ext = os === 'windows' ? 'zip' : 'tar.gz';
        const res = await axios_1.default.get('https://api.azul.com/zulu/download/community/v1.0/bundles', {
            headers: {
                'User-Agent': defaults_1.ORIGAMi_USER_AGENT
            },
            params: {
                java_version,
                os: osMap[os],
                arch: archMap[arch],
                bundle_type: imageType,
                ext
            }
        });
        const bundle = res.data[0];
        if (!bundle)
            throw new Error(`No Zulu binary found for ${os}/${arch} Java ${java_version} 😢`);
        return {
            name: bundle.name,
            link: bundle.url
        };
    }
};
//# sourceMappingURL=zulu.js.map