import axios from 'axios';
import os from 'os';
import { ORIGAMi_USER_AGENT } from '../../config/defaults';

function detectOS(): string {
    switch (os.platform()) {
        case 'linux': return 'linux';
        case 'darwin': return 'macos';
        case 'win32': return 'windows';
        default: return 'linux';
    }
}

function detectArch(): string {
    switch (os.arch()) {
        case 'x64': return 'x64';
        case 'arm64': return 'aarch64';
        default: return 'x64';
    }
}

async function checkIfUrl404(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.status === 404;
    } catch {
        return false;
    }
}

async function correttoFetch(
    version: string,
    os: string = detectOS(),
    arch: string = detectArch()
): Promise<{
    version: string;
    jdk: { name: string; link: string };
} | undefined> {
    const ext = os === 'windows' ? '.zip' : '.tar.gz';

    const jdkName = `amazon-corretto-${version}-${arch}-${os}-jdk${ext}`;
    const jdkUrl = `https://corretto.aws/downloads/latest/${jdkName}`;

    const jdkMissing = await checkIfUrl404(jdkUrl);

    if (jdkMissing) return undefined;

    return {
        version,
        jdk: { name: jdkName, link: jdkUrl }
    };
}

export const correttoProvider = {
    name: 'Amazon Corretto',
    withJre: false,

    async listVersions(): Promise<string[]> {
        const azul = await axios.get('https://api.azul.com/metadata/v1/zulu/packages', {
            headers: { 'User-Agent': ORIGAMi_USER_AGENT },
            params: {
                java_package_type: 'jdk',
                availability_types: 'CA',
                release_status: 'ga',
                page: 1,
                page_size: 1000,
            },
        });

        const seen = new Set<string>();
        const rawVersions = azul.data as { java_version: string[] }[];
        for (const pkg of rawVersions) {
            if (pkg.java_version?.[0]) seen.add(`${pkg.java_version[0]}`);
        }

        const versions = Array.from(seen).sort((a, b) => {
            const parse = (v: string) => v.split('.').map(n => parseInt(n));
            const [aM, aN = 0, aP = 0] = parse(a);
            const [bM, bN = 0, bP = 0] = parse(b);
            if (aM !== bM) return bM - aM;
            if (aN !== bN) return bN - aN;
            return bP - aP;
        });

        const valid = await Promise.all(
            versions.map(async (v) => {
                const resolved = await correttoFetch(v);
                return resolved ? `Corretto ${resolved.version}` : undefined;
            })
        );

        return valid.filter(Boolean) as string[];
    },

    async getBinary(
        version: string,
        os: string,
        arch: string,
        imageType: 'jdk' | 'jre'
    ): Promise<{ name: string; link: string }> {
        const javaVersion = version.replace('Corretto ', '');

        const osMap: Record<string, string> = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };

        const archMap: Record<string, string> = {
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
