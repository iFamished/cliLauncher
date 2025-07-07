import axios from 'axios';
const API_BASE = 'https://api.adoptium.net/v3';

export const temurinProvider = {
    name: 'Adoptium Temurin',
    withJre: true,
    async listVersions() {
        const res = await axios.get(`${API_BASE}/info/available_releases`);
        return res.data.available_lts_releases.map((v: number) => `Temurin ${v} ✨`).reverse();
    },
    async getBinary(version: string, os: string, arch: string, imageType: string) {
        const versionNum = version.replace('Temurin ', '').replace(' ✨', '');
        const res = await axios.get(`${API_BASE}/assets/feature_releases/${versionNum}/ga`, {
            params: {
                architecture: arch,
                image_type: imageType,
                jvm_impl: 'hotspot',
                os,
                heap_size: 'normal',
                vendor: 'eclipse'
            }
        });
        const binaries = res.data;
        const binary = binaries[0].binary ? binaries[0].binary.package : binaries[0].binaries[0].package;
        return { name: binary.name, link: binary.link };
    }
};
