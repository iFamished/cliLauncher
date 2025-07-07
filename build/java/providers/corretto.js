"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correttoProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const os_1 = __importDefault(require("os"));
const defaults_1 = require("../../config/defaults");
function detectOS() {
    switch (os_1.default.platform()) {
        case 'linux': return 'linux';
        case 'darwin': return 'macos';
        case 'win32': return 'windows';
        default: return 'linux';
    }
}
function detectArch() {
    switch (os_1.default.arch()) {
        case 'x64': return 'x64';
        case 'arm64': return 'aarch64';
        default: return 'x64';
    }
}
async function checkIfUrl404(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.status === 404;
    }
    catch {
        return false;
    }
}
async function correttoFetch(version, os = detectOS(), arch = detectArch()) {
    const ext = os === 'windows' ? '.zip' : '.tar.gz';
    const jdkName = `amazon-corretto-${version}-${arch}-${os}-jdk${ext}`;
    const jdkUrl = `https://corretto.aws/downloads/latest/${jdkName}`;
    const jdkMissing = await checkIfUrl404(jdkUrl);
    if (jdkMissing)
        return undefined;
    return {
        version,
        jdk: { name: jdkName, link: jdkUrl }
    };
}
exports.correttoProvider = {
    name: 'Amazon Corretto',
    withJre: false,
    async listVersions() {
        const azul = await axios_1.default.get('https://api.azul.com/metadata/v1/zulu/packages', {
            headers: { 'User-Agent': defaults_1.ORIGAMi_USER_AGENT },
            params: {
                java_package_type: 'jdk',
                availability_types: 'CA',
                release_status: 'ga',
                page: 1,
                page_size: 1000,
            },
        });
        const seen = new Set();
        const rawVersions = azul.data;
        for (const pkg of rawVersions) {
            if (pkg.java_version?.[0])
                seen.add(`${pkg.java_version[0]}`);
        }
        const versions = Array.from(seen).sort((a, b) => {
            const parse = (v) => v.split('.').map(n => parseInt(n));
            const [aM, aN = 0, aP = 0] = parse(a);
            const [bM, bN = 0, bP = 0] = parse(b);
            if (aM !== bM)
                return bM - aM;
            if (aN !== bN)
                return bN - aN;
            return bP - aP;
        });
        const valid = await Promise.all(versions.map(async (v) => {
            const resolved = await correttoFetch(v);
            return resolved ? `Corretto ${resolved.version}` : undefined;
        }));
        return valid.filter(Boolean);
    },
    async getBinary(version, os, arch, imageType) {
        const javaVersion = version.replace('Corretto ', '');
        const osMap = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };
        const archMap = {
            x64: 'x64',
            aarch64: 'aarch64',
        };
        const resolved = await correttoFetch(javaVersion, osMap[os], archMap[arch]);
        if (!resolved) {
            throw new Error(`No Corretto binary found for ${os}/${arch} Java ${javaVersion} 😢`);
        }
        return resolved.jdk;
    },
};
//# sourceMappingURL=corretto.js.map