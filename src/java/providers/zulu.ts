import axios from 'axios';
import { ORIGAMi_USER_AGENT } from '../../config/defaults';

export const zuluProvider = {
    name: 'Zulu OpenJDK',
    withJre: true,

    async listVersions(): Promise<string[]> {
        const res = await axios.get(
            'https://api.azul.com/metadata/v1/zulu/packages',
            {
                headers: { 'User-Agent': ORIGAMi_USER_AGENT },
                params: {
                    java_package_type: 'jdk',
                    availability_types: 'CA',
                    release_status: 'ga',
                    page: 1,
                    page_size: 1000,
                },
            }
        );

        const versions: string[] = Array.from(
            new Set(
                res.data
                    .filter((p: any) => p.java_version)
                    .map((p: any) => `Zulu ${p.java_version[0]}`)
            )
        );

        return versions.sort((a, b) => {
            const ev = (s: string) =>
                s.replace('Zulu ', '')
                    .split('.')
                    .map((x) => parseInt(x, 10));
            const [aM, aN = 0, aP = 0] = ev(a),
                [bM, bN = 0, bP = 0] = ev(b);
            if (aM !== bM) return bM - aM;
            if (aN !== bN) return bN - aN;
            return bP - aP;
        });
    },

    async getBinary(
        version: string,
        os: string,
        arch: string,
        imageType: string
    ): Promise<{ name: string; link: string }> {
        const javaVersion = version.replace('Zulu ', '');
        const osMap: Record<string, string> = {
            linux: 'linux',
            mac: 'macos',
            windows: 'windows',
        };
        const archMap: Record<string, string> = {
            x64: 'x86_64',
            aarch64: 'aarch64',
        };

        const res = await axios.get(
            'https://api.azul.com/metadata/v1/zulu/packages',
            {
                headers: { 'User-Agent': ORIGAMi_USER_AGENT },
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
            }
        );

        const pkg = res.data[0];
        if (!pkg) {
            throw new Error(
                `No Zulu binary found for ${os}/${arch} Java ${javaVersion} 😢`
            );
        }

        return {
            name: pkg.name,
            link: pkg.download_url,
        };
    }
};