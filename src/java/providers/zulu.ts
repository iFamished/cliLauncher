import axios from 'axios';
import { ORIGAMi_USER_AGENT } from '../../config/defaults';

export const zuluProvider = {
    name: 'Zulu OpenJDK',
    withJre: true,

    async listVersions(): Promise<string[]> {
        const res = await axios.get('https://api.azul.com/zulu/download/community/v1.0/bundles', {
            headers: {
                'User-Agent': ORIGAMi_USER_AGENT
            }
        });

        const versions: string[] = Array.from(
            new Set(
                res.data
                    .filter((entry: any) => entry.java_version)
                    .map((entry: any) => `Zulu ${entry.java_version}`)
            )
        );

        const sorted = versions.sort((a, b) => {
            const ev = (s: string) => s.replace('Zulu ', '').split('.').map(x => parseInt(x, 10));
            const [aM, aN = 0, aP = 0] = ev(a), [bM, bN = 0, bP = 0] = ev(b);
            if (aM !== bM) return bM - aM;
            if (aN !== bN) return bN - aN;
            return bP - aP;
        });

        return sorted as string[];
    },

    async getBinary(
        version: string,
        os: string,
        arch: string,
        imageType: string
    ): Promise<{ name: string; link: string }> {
        const java_version = version.replace('Zulu ', '');

        const osMap: Record<string, string> = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };

        const archMap: Record<string, string> = {
            x64: 'x86_64',
            aarch64: 'aarch64',
        };

        const ext = os === 'windows' ? 'zip' : 'tar.gz';

        const res = await axios.get('https://api.azul.com/zulu/download/community/v1.0/bundles', {
            headers: {
                'User-Agent': ORIGAMi_USER_AGENT
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
        if (!bundle) throw new Error(`No Zulu binary found for ${os}/${arch} Java ${java_version} 😢`);

        return {
            name: bundle.name,
            link: bundle.url
        };
    }
};