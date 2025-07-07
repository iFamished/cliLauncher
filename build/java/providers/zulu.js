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
        const res = await axios_1.default.get('https://api.azul.com/metadata/v1/zulu/packages', {
            headers: { 'User-Agent': defaults_1.ORIGAMi_USER_AGENT },
            params: {
                java_package_type: 'jdk',
                availability_types: 'CA',
                release_status: 'ga',
                page: 1,
                page_size: 1000,
            },
        });
        const versions = Array.from(new Set(res.data
            .filter((p) => p.java_version)
            .map((p) => `Zulu ${p.java_version[0]}`)));
        return versions.sort((a, b) => {
            const ev = (s) => s.replace('Zulu ', '')
                .split('.')
                .map((x) => parseInt(x, 10));
            const [aM, aN = 0, aP = 0] = ev(a), [bM, bN = 0, bP = 0] = ev(b);
            if (aM !== bM)
                return bM - aM;
            if (aN !== bN)
                return bN - aN;
            return bP - aP;
        });
    },
    async getBinary(version, os, arch, imageType) {
        const javaVersion = version.replace('Zulu ', '');
        const osMap = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };
        const archMap = {
            x64: 'x86_64',
            aarch64: 'aarch64',
        };
        const res = await axios_1.default.get('https://api.azul.com/metadata/v1/zulu/packages', {
            headers: { 'User-Agent': defaults_1.ORIGAMi_USER_AGENT },
            params: {
                java_version: javaVersion,
                os: osMap[os],
                arch: archMap[arch],
                java_package_type: imageType,
                javafx_bundled: imageType === 'jre' ? false : undefined,
                availability_types: 'CA',
                release_status: 'ga',
                page: 1,
                page_size: 1000,
            },
        });
        const pkg = res.data[0];
        if (!pkg) {
            throw new Error(`No Zulu binary found for ${os}/${arch} Java ${javaVersion} 😢`);
        }
        return {
            name: pkg.name,
            link: pkg.download_url,
        };
    }
};
//# sourceMappingURL=zulu.js.map