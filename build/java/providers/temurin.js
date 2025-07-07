"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.temurinProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const API_BASE = 'https://api.adoptium.net/v3';
exports.temurinProvider = {
    name: 'Adoptium Temurin',
    withJre: true,
    async listVersions() {
        const res = await axios_1.default.get(`${API_BASE}/info/available_releases`);
        return res.data.available_lts_releases.map((v) => `Temurin ${v} ✨`).reverse();
    },
    async getBinary(version, os, arch, imageType) {
        const versionNum = version.replace('Temurin ', '').replace(' ✨', '');
        const res = await axios_1.default.get(`${API_BASE}/assets/feature_releases/${versionNum}/ga`, {
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
//# sourceMappingURL=temurin.js.map