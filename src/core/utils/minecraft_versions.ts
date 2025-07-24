import axios from "axios";
import { VersionData, VersionManifest } from "../../types/version";
import inquirer from "inquirer";

let versions_manifest = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

export async function fetchMinecraftVersionManifest(): Promise<VersionManifest> {
    let req = await axios.get(versions_manifest);
    let _test = req.data.versions

    return req.data as VersionManifest;
}

export async function fetchMinecraftVersions(): Promise<string[]> {
    const response = await axios.get(versions_manifest);
    return response.data.versions
        .filter((v: any) => v.type === 'release')
        .map((v: any) => v.id);
}

export async function askForVersion(mcVersions: VersionData[], latestMC: string): Promise<string> {
    const versions = mcVersions.filter(v => v.id && v.type);
    const versionTypes = Array.from(new Set(versions.map(v => v.type)));

    const { selectedType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedType',
            message: '📦 Select version type:',
            choices: versionTypes
        }
    ]);

    const filteredVersions = versions.filter(v => v.type === selectedType);
    const { minecraftVersion } = await inquirer.prompt([
        {
            type: 'list',
            name: 'minecraftVersion',
            message: `🎮 Select Minecraft version (${selectedType}):`,
            choices: filteredVersions.map(v => v.id),
            default: latestMC
        }
    ]);

    return minecraftVersion;
}

export async function getRequiredJavaMajor(versionId: string): Promise<number | null> {
    try {
        const manifest = await fetchMinecraftVersionManifest();
        const entry = manifest.versions.find(v => v.id === versionId);
        if (!entry) return null;

        const res = await axios.get(entry.url);
        const vjson = res.data;
        return vjson?.javaVersion?.majorVersion || null;
    } catch(_) {
        return null;
    }
}

export async function isJavaCompatible(installed: string | null, versionId: string): Promise<{ result: boolean, installed: number | null, required: number | null }> {
    if(installed && installed.startsWith('1.')) installed = installed.replaceAll('1.', '');

    const majInstalled = installed ? parseInt(installed) : NaN;
    const required = await getRequiredJavaMajor(versionId);
    return {
        result: !isNaN(majInstalled) && required !== null && majInstalled >= required,
        installed: majInstalled,
        required: required,
    };
}
