import axios from 'axios';
import { ORIGAMi_USER_AGENT } from '../../config/defaults';

export const graalvmProvider = {
    name: 'GraalVM',
    withJre: false,

    async listVersions(): Promise<string[]> {
        const res = await axios.get('https://api.github.com/repos/graalvm/graalvm-ce-builds/releases', {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': ORIGAMi_USER_AGENT
            }
        });

        const versions: string[] = res.data
            .map((release: any) => release.tag_name)
            .filter((tag: string) => tag.startsWith('jdk-'))
            .map((tag: string) => `GraalVM ${tag}`);
        
        const sorted = versions.sort((a, b) => {
            const extractVersion = (str: string) =>
                str.replace('GraalVM jdk-', '').split('.').map(n => parseInt(n, 10));

            const [aMajor, aMinor, aPatch] = extractVersion(a);
            const [bMajor, bMinor, bPatch] = extractVersion(b);

            if (aMajor !== bMajor) return bMajor - aMajor;
            if (aMinor !== bMinor) return bMinor - aMinor;
            return bPatch - aPatch;
        });

        return sorted;
    },

    async getBinary(version: string, os: string, arch: string, imageType: string): Promise<{ name: string, link: string }> {
        const tag = version.replace('GraalVM ', '');
        const res = await axios.get(`https://api.github.com/repos/graalvm/graalvm-ce-builds/releases/tags/${tag}`, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': ORIGAMi_USER_AGENT
            }
        });

        const assets = res.data.assets;

        const platformFragment = (() => {
            const osMap: Record<string, string> = {
                linux: 'linux',
                mac: 'macos',
                windows: 'windows'
            };
            const archMap: Record<string, string> = {
                x64: 'x64',
                aarch64: 'aarch64'
            };
            return `${osMap[os]}-${archMap[arch]}`;
        })();

        const ext = os === 'windows' ? '.zip' : '.tar.gz';
        const asset = assets.find((a: any) => typeof a.name === 'string' && a.name.includes(platformFragment) && a.name.includes(tag) && a.name.endsWith(ext));
        if (!asset) throw new Error(`No GraalVM binary found for ${platformFragment} 😢`);

        return {
            name: asset.name,
            link: asset.browser_download_url
        };
    }
};