import axios from "axios";
import { VersionData, VersionManifest } from "../../types/version";
import inquirer from "inquirer";

let versions_manifest = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';

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