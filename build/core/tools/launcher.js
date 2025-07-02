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
const mcDir = (0, common_1.minecraft_dir)(true);
const launcherProfilesPath = path.join(mcDir, 'profiles.json');
class LauncherProfileManager {
    filePath;
    data;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { origami_profiles: {} };
        this.load();
        this.autoImportVanillaProfiles();
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
                const versionJson = (0, fs_extra_1.readJsonSync)(versionJsonPath);
                const name = folder;
                const id = versionJson.id || versionJson.inheritsFrom || 'Origami-Imported-' + (0, uuid_1.v4)();
                if (!this.data.origami_profiles[name]) {
                    this.addProfile(name, id, path.join(versionsDir, folder), {
                        name: id,
                        description: versionJson.type || folder,
                        author: 'OrigamiImportSystem'
                    }, id, 'Grass', true);
                    console.log(chalk_1.default.gray(`✔ Imported version: ${id}`));
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
                path: version_path
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
        if (selectedProfile) {
            this.selectProfile(selectedId);
            console.log(chalk_1.default.green(`✨ Selected profile: ${selectedProfile.name}`));
        }
        return selectedProfile ?? null;
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