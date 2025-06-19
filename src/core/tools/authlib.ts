import axios from 'axios';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { GitHubRelease } from '../../types/github';
import { cleanDir, ensureDir, localpath } from '../utils/common';
import { downloader } from '../utils/download';
import { AUTHLIB_ARGS } from '../../config/defaults';

const RELEASE_INFO = 'release.json';

async function fetchAllReleases(): Promise<GitHubRelease[]> {
    const url = 'https://api.github.com/repos/yushijinhun/authlib-injector/releases?per_page=100';

    const response = await axios.get<GitHubRelease[]>(url, {
        headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'axios-client',
        },
    });

    return response.data;
}

async function get_authlib(server: string): Promise<string> {
    const spinner = ora('AuthLib: Fetching AuthLib').start();

    const authlibDir = path.join(localpath(false), 'authlib');
    const jarPath = path.join(authlibDir, 'authlib-injector.jar');
    const releaseInfoPath = path.join(authlibDir, RELEASE_INFO);

    try {
        const releases = await fetchAllReleases();

        for (const release of releases) {
            const tag = release.tag_name;

            const matchingAsset = release.assets.find(
                asset =>
                    asset.name.endsWith('.jar') &&
                    asset.name.toLowerCase().includes('authlib')
            );

            if (!matchingAsset) continue;

            const jarExists = fs.existsSync(jarPath);
            const tagMatches =
                fs.existsSync(releaseInfoPath) &&
                (await fs.readJson(releaseInfoPath)).tag === tag;

            if (jarExists && tagMatches) {
                spinner.succeed(`AuthLib: Existing up-to-date injector found (${tag})`);
                return AUTHLIB_ARGS.replaceAll('$AUTH', `${jarPath}`).replaceAll('$SERVER', server);
            }

            spinner.text = `AuthLib: Downloading latest injector from ${tag}...`;

            cleanDir(authlibDir);
            ensureDir(authlibDir);

            spinner.stop();
            await downloader(matchingAsset.browser_download_url, jarPath);

            await fs.writeJson(releaseInfoPath, { tag }, { spaces: 2 });

            spinner.succeed(`AuthLib: Downloaded and saved ${tag}`);
            return AUTHLIB_ARGS.replaceAll('$AUTH', `"${jarPath}"`).replaceAll('$SERVER', server);
        }

        spinner.fail('AuthLib: No suitable authlib-injector jar found in any release.');
        return '';

    } catch (error) {
        spinner.fail('AuthLib: Failed to fetch or download: ' + (error as Error).message);
        return '';
    }
}

export default get_authlib;
