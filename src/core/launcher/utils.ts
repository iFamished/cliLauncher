import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import Handler from './handler';

interface VersionManifest {
    versions: { id: string; url: string }[];
}

async function fetchAndCache(url: string, cachePath: string, label: string, emit: (msg: string) => void): Promise<string> {
    try {
        const { data } = await axios.get(url);
        const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(cachePath, body);
        emit(`[MCLC]: Cached ${label}`);
        return body;
    } catch (err: any) {
        emit(`[MCLC]: Failed to fetch ${label} from network. Trying cache...`);
        try {
            return await fs.readFile(cachePath, 'utf-8');
        } catch {
            throw new Error(`[MCLC]: Unable to load ${label} from both network and cache.`);
        }
    }
}

export async function fetchVersionManifest(
    client: Handler,
    manifestUrl: string,
    cacheDir: string
): Promise<any> {
    const emit = (msg: string) => client.client.emit('debug', msg);
    const versionId = client.options?.version.number;
    if (!versionId) throw new Error('Version number not specified in client options.');

    const manifestCachePath = path.join(cacheDir, 'version_manifest.json');
    const manifestRaw = await fetchAndCache(manifestUrl, manifestCachePath, 'version_manifest.json', emit);
    
    let manifest: VersionManifest;
    try {
        manifest = JSON.parse(manifestRaw);
    } catch {
        throw new Error('[MCLC]: Failed to parse version_manifest.json');
    }

    const versionMeta = manifest.versions.find(v => v.id === versionId);
    if (!versionMeta) throw new Error(`[MCLC]: Version ${versionId} not found in manifest.`);

    const versionCachePath = path.join(cacheDir, `${versionId}.json`);
    const versionRaw = await fetchAndCache(versionMeta.url, versionCachePath, `${versionId}.json`, emit);

    try {
        client.version = JSON.parse(versionRaw);
    } catch {
        throw new Error(`[MCLC]: Failed to parse ${versionId}.json`);
    }

    emit(`[MCLC]: Loaded version ${versionId} metadata`);
    return client.version;
}