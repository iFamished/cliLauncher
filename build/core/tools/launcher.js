"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LauncherProfileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("../utils/common");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = require("fs-extra");
const uuid_1 = require("uuid");
const forge_1 = __importDefault(require("../game/install/mod_loaders/forge"));
const neo_forge_1 = __importDefault(require("../game/install/mod_loaders/neo_forge"));
const fabric_1 = __importDefault(require("../game/install/mod_loaders/fabric"));
const quilt_1 = __importDefault(require("../game/install/mod_loaders/quilt"));
const vanilla_1 = __importDefault(require("../game/install/vanilla"));
const options_1 = __importDefault(require("../game/launch/options"));
const mcDir = (0, common_1.minecraft_dir)(true);
const launcherProfilesPath = path.join(mcDir, 'profiles.json');
const legacy_210_profiles = path.join((0, common_1.minecraft_dir)(), 'origami_files', 'profiles.json');
class LauncherProfileManager {
    filePath;
    data;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        if (fs.existsSync(legacy_210_profiles)) {
            fs.writeFileSync(filePath, fs.readFileSync(legacy_210_profiles));
            setTimeout(() => fs.unlinkSync(legacy_210_profiles), 500);
        }
        this.data = { origami_profiles: {} };
        this.load();
        this.autoImportVanillaProfiles();
    }
    fetchMetadata(folder, versionJsonPath) {
        const versionJson = (0, fs_extra_1.readJsonSync)(versionJsonPath);
        const id = versionJson.id || versionJson.inheritsFrom || folder || 'Origami-Imported-' + (0, uuid_1.v4)();
        const mc = versionJson.inheritsFrom || versionJson.id || folder || 'Origami-Imported-' + (0, uuid_1.v4)();
        const idLower = id.toLowerCase();
        const mainClass = (versionJson.mainClass || "").toLowerCase();
        const libraries = (versionJson.libraries || []).map((lib) => lib.name || "").join(",");
        if (idLower.includes('neoforge') || libraries.includes('neoforge')) {
            return { version: id, mc_version: mc, metadata: neo_forge_1.default.metadata };
        }
        else if (idLower.includes('forge') || mainClass.includes('forge') || libraries.includes('forge')) {
            return { version: id, mc_version: mc, metadata: forge_1.default.metadata };
        }
        else if (idLower.includes('quilt') || mainClass.includes('quilt') || libraries.includes('quilt')) {
            return { version: id, mc_version: mc, metadata: quilt_1.default.metadata };
        }
        else if (idLower.includes('fabric') || mainClass.includes('fabric') || libraries.includes('fabric')) {
            return { version: id, mc_version: mc, metadata: fabric_1.default.metadata };
        }
        else {
            return { version: id, mc_version: mc, metadata: vanilla_1.default.metadata };
        }
    }
    cleanupProfiles() {
        const versionsDir = path.join((0, common_1.minecraft_dir)(), 'versions');
        const removed = [];
        for (const id of Object.keys(this.data.origami_profiles)) {
            const profile = this.data.origami_profiles[id];
            const versionFolder = path.join(versionsDir, profile.origami.path);
            if (!fs.existsSync(versionFolder)) {
                removed.push(id);
                delete this.data.origami_profiles[id];
                if (this.data.selectedProfile === id) {
                    this.data.selectedProfile = undefined;
                }
            }
        }
        if (removed.length > 0) {
            console.log(chalk_1.default.gray(`🧹 Cleaned up ${removed.length} invalid profile(s): ${removed.join(", ")}`));
            this.save();
        }
    }
    autoImportVanillaProfiles() {
        const versionsDir = path.join((0, common_1.minecraft_dir)(), 'versions');
        if (!fs.existsSync(versionsDir))
            return;
        const folders = fs.readdirSync(versionsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        for (const folder of folders) {
            const versionJsonPath = path.join(versionsDir, folder, `${folder}.json`);
            if (!fs.existsSync(versionJsonPath))
                continue;
            try {
                const name = folder;
                const manifest = this.fetchMetadata(name, versionJsonPath);
                if (!this.data.origami_profiles[name] || !Object.values(this.data.origami_profiles).find(v => v.name === name)) {
                    this.addProfile(name, manifest.mc_version, name, manifest.metadata, name, manifest.metadata.name);
                    console.log(chalk_1.default.gray(`✔ Imported version: ${name}`));
                }
            }
            catch (e) {
                console.warn(chalk_1.default.red(`⚠️ Failed to parse version JSON: ${folder}`));
            }
        }
    }
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.cleanupProfiles();
            }
            catch (err) {
                console.error('Failed to parse launcher_profiles.json:', err);
            }
        }
        else {
            this.save();
        }
    }
    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }
    reset() {
        fs.writeFileSync(this.filePath, JSON.stringify({ origami_profiles: {} }, null, 2));
    }
    getJvm(id) {
        let profile = this.getProfile(id);
        if (!profile)
            return '';
        return profile.origami.jvm;
    }
    editJvm(id, jvm) {
        let profile = this.getProfile(id);
        if (!profile)
            return '';
        this.data.origami_profiles[id].origami.jvm = jvm;
        this.save();
        return jvm;
    }
    addProfile(id, versionId, version_path, metadata, name, icon, donot_auto_add) {
        this.load();
        const now = new Date().toISOString();
        const profile = {
            name: name ?? id,
            type: 'custom',
            created: now,
            lastUsed: now,
            lastVersionId: versionId,
            icon: icon ?? 'Furnace',
            origami: {
                metadata,
                version: id,
                path: version_path,
                jvm: ''
            }
        };
        this.data.origami_profiles[id] = profile;
        this.save();
        if (!donot_auto_add)
            this.selectProfile(id);
    }
    deleteProfile(id) {
        this.load();
        if (this.data.origami_profiles[id]) {
            delete this.data.origami_profiles[id];
            if (this.data.selectedProfile === id) {
                this.data.selectedProfile = undefined;
            }
            this.save();
        }
    }
    selectProfile(id) {
        this.load();
        if (this.data.origami_profiles[id]) {
            this.data.selectedProfile = id;
            this.data.origami_profiles[id].lastUsed = new Date().toISOString();
            this.save();
        }
        else {
            console.warn(`Profile "${id}" does not exist.`);
        }
    }
    async chooseProfile() {
        this.load();
        const profileIds = Object.keys(this.data.origami_profiles);
        if (profileIds.length === 0) {
            console.log(chalk_1.default.red("❌ No profiles available."));
            return null;
        }
        const choices = profileIds.map((id) => {
            const profile = this.data.origami_profiles[id];
            const meta = profile.origami.metadata;
            const name = chalk_1.default.hex("#c4b5fd")(profile.name);
            const version = chalk_1.default.green(`[${profile.lastVersionId}]`);
            const author = chalk_1.default.yellow(meta.author || "unknown");
            const desc = chalk_1.default.gray(meta.description || "No description");
            return {
                name: `${version} ${name} ${chalk_1.default.gray('by')} ${author} - ${desc}`,
                value: id
            };
        });
        const { selectedId } = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "selectedId",
                message: chalk_1.default.hex("#f472b6")("🌸 Pick a profile to use:"),
                choices,
                loop: false
            }
        ]);
        const selectedProfile = this.getProfile(selectedId);
        if (!selectedProfile) {
            console.log(chalk_1.default.red("❌ Invalid profile selected."));
            return null;
        }
        const { action } = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "action",
                message: chalk_1.default.cyanBright(`📦 What would you like to do with "${selectedProfile.name}"?`),
                choices: [
                    { name: '✅ Select as current profile', value: 'select' },
                    { name: '⚙️  Configure profile', value: 'configure' },
                    new inquirer_1.default.Separator(),
                    { name: '❌ Cancel', value: 'cancel' }
                ]
            }
        ]);
        switch (action) {
            case 'select':
                this.selectProfile(selectedId);
                console.log(chalk_1.default.green(`✨ Selected profile: ${selectedProfile.name}`));
                return selectedProfile;
            case 'configure':
                const optionsManager = new options_1.default();
                optionsManager.setProfile(selectedProfile);
                await optionsManager.configureOptions();
                return selectedProfile;
            case 'cancel':
            default:
                console.log(chalk_1.default.yellow('🚫 Cancelled.'));
                return null;
        }
    }
    listProfiles() {
        this.load();
        return Object.keys(this.data.origami_profiles);
    }
    getProfile(id) {
        this.load();
        return this.data.origami_profiles[id];
    }
    getSelectedProfile() {
        this.load();
        return this.getProfile(this.data.selectedProfile || "");
    }
}
exports.LauncherProfileManager = LauncherProfileManager;
exports.default = LauncherProfileManager;
//# sourceMappingURL=launcher.js.map