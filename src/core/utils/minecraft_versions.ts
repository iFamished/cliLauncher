import axios from "axios";
import { VersionManifest } from "../../types/version";

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

