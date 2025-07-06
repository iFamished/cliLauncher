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
exports.ModrinthModManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const common_1 = require("../../../utils/common");
const mcDir = (0, common_1.minecraft_dir)(true);
class ModrinthModManager {
    filePath;
    versionPath;
    data;
    constructor(profile) {
        this.versionPath = path.join(mcDir, 'instances', profile.origami.path);
        this.filePath = path.join(this.versionPath, 'origami_installs.json');
        this.data = { version: this.versionPath, installed: { mods: [], shaders: [], resourcepacks: [] }, disabled: [] };
        this.load();
        this.cleanup_mods();
        this.auto_import_mods();
    }
    cleanup_mods() {
        const mods_folder = path.join(this.versionPath, 'mods');
        const removed = [];
        for (const mod of this.data.installed.mods) {
            const mod_file = path.join(mods_folder, mod);
            const disabled_mod_file = path.join(mods_folder, mod.replace(/\.jar$/, '.jar.disabled'));
            if (!fs.existsSync(mod_file) && !fs.existsSync(disabled_mod_file)) {
                removed.push(mod);
                this.deleteMod(mod);
            }
        }
        if (removed.length > 0) {
            console.log(chalk_1.default.gray(`🧹 Cleaned up ${removed.length} invalid mods(s): ${removed.join(", ")}`));
            this.save();
        }
    }
    auto_import_mods() {
        const modsDir = path.join(this.versionPath, 'mods');
        if (!fs.existsSync(modsDir))
            return;
        const mods = fs.readdirSync(modsDir, { withFileTypes: true })
            .filter(dirent => !dirent.isDirectory() && (dirent.name.endsWith('.jar') || dirent.name.endsWith('.jar.disabled')))
            .map(dirent => dirent.name);
        for (const mod of mods) {
            if (mod.endsWith('.jar.disabled')) {
                let mod_name = mod.replaceAll('.jar.disabled', '.jar');
                if (!this.getMod(mod_name)) {
                    this.addMod(mod_name);
                }
                console.log(chalk_1.default.gray(`✔ Imported disabled mod: ${mod}`));
            }
            else if (!this.getMod(mod)) {
                this.addMod(mod);
                console.log(chalk_1.default.gray(`✔ Imported mod: ${mod}`));
            }
            ;
        }
        const shaderDir = path.join(this.versionPath, 'shaderpacks');
        if (!fs.existsSync(shaderDir))
            return;
        const shaders = fs.readdirSync(shaderDir, { withFileTypes: true }).map(dirent => dirent.name);
        for (const shader of shaders) {
            if (!this.getShader(shader)) {
                this.addShader(shader);
                console.log(chalk_1.default.gray(`✔ Imported shaders: ${shader}`));
            }
        }
        const resPackDir = path.join(this.versionPath, 'resourcepacks');
        if (!fs.existsSync(resPackDir))
            return;
        const respacks = fs.readdirSync(resPackDir, { withFileTypes: true }).map(dirent => dirent.name);
        for (const respack of respacks) {
            if (!this.getResPack(respack)) {
                this.addResPack(respack);
                console.log(chalk_1.default.gray(`✔ Imported resource pack: ${respack}`));
            }
        }
    }
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            }
            catch (err) {
                console.error('Failed to parse origami_mods.json:', err);
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
        fs.unlinkSync(this.filePath);
        const modsDir = path.join(this.versionPath, 'mods');
        const shaderDir = path.join(this.versionPath, 'shaderpacks');
        const resPackDir = path.join(this.versionPath, 'resourcepacks');
        if (fs.existsSync(modsDir)) {
            fs.rmSync(modsDir, { recursive: true, force: true });
        }
        ;
        if (fs.existsSync(shaderDir)) {
            fs.rmSync(shaderDir, { recursive: true, force: true });
        }
        ;
        if (fs.existsSync(resPackDir)) {
            fs.rmSync(resPackDir, { recursive: true, force: true });
        }
        ;
    }
    addMod(mod) {
        this.load();
        if (!this.getMod(mod))
            this.data.installed.mods.push(mod);
        this.save();
    }
    deleteMod(mod) {
        this.load();
        if (this.getMod(mod)) {
            if (this.isModDisabled(mod)) {
                this.enableMod(mod);
            }
            let file = this.getMod(mod);
            let full_path = path.join(this.versionPath, 'mods', file || '');
            if (file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }
            this.data.installed.mods = this.data.installed.mods.filter(md => md !== mod);
            this.save();
        }
    }
    addShader(shader) {
        this.load();
        if (!this.getShader(shader))
            this.data.installed.shaders.push(shader);
        this.save();
    }
    deleteShader(shader) {
        this.load();
        if (this.getShader(shader)) {
            let file = this.getShader(shader);
            let full_path = path.join(this.versionPath, 'shaderpacks', file || '');
            if (file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }
            this.data.installed.shaders = this.data.installed.shaders.filter(sh => sh !== shader);
            this.save();
        }
    }
    addResPack(respack) {
        this.load();
        if (!this.getResPack(respack))
            this.data.installed.resourcepacks.push(respack);
        this.save();
    }
    deleteResPack(respack) {
        this.load();
        if (this.getResPack(respack)) {
            let file = this.getResPack(respack);
            let full_path = path.join(this.versionPath, 'resourcepacks', file || '');
            if (file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }
            this.data.installed.resourcepacks = this.data.installed.resourcepacks.filter(rp => rp !== respack);
            this.save();
        }
    }
    isModDisabled(mod) {
        return this.getMod(mod) && this.getDisabledMod(mod);
    }
    getDisabledMod(mod) {
        return this.data.disabled.find(v => v === mod);
    }
    disableMod(mod) {
        this.load();
        const mods = path.join(this.versionPath, 'mods');
        if (!this.getMod(mod) || this.isModDisabled(mod))
            return;
        const modPath = path.join(mods, mod);
        const disabledPath = path.join(mods, mod.replace(/\.jar$/, '.jar.disabled'));
        if (!fs.existsSync(modPath))
            return;
        if (fs.existsSync(disabledPath))
            fs.unlinkSync(disabledPath);
        fs.renameSync(modPath, disabledPath);
        this.data.disabled.push(mod);
        this.save();
    }
    enableMod(mod) {
        this.load();
        const mods = path.join(this.versionPath, 'mods');
        if (!this.getMod(mod) || !this.getDisabledMod(mod))
            return;
        const disabledModPath = path.join(mods, mod.replace(/\.jar$/, '.jar.disabled'));
        const enabledModPath = path.join(mods, mod);
        if (!fs.existsSync(disabledModPath))
            return;
        if (fs.existsSync(enabledModPath))
            fs.unlinkSync(enabledModPath);
        fs.renameSync(disabledModPath, enabledModPath);
        const index = this.data.disabled.indexOf(mod);
        if (index !== -1)
            this.data.disabled.splice(index, 1);
        this.save();
    }
    getList() {
        this.load();
        return this.data.installed;
    }
    getFromType(name, type) {
        if (type === 'mod')
            return this.getMod(name);
        else if (type === 'resourcepack')
            return this.getResPack(name);
        else if (type === 'shader')
            return this.getShader(name);
        else
            return;
    }
    deleteFromType(name, type) {
        if (type === 'mod')
            return this.deleteMod(name);
        else if (type === 'resourcepack')
            return this.deleteResPack(name);
        else if (type === 'shader')
            return this.deleteShader(name);
        else
            return;
    }
    addFromType(name, type) {
        if (type === 'mod')
            return this.addMod(name);
        else if (type === 'resourcepack')
            return this.deleteResPack(name);
        else if (type === 'shader')
            return this.deleteShader(name);
        else
            return;
    }
    getMod(mod) {
        this.load();
        return this.data.installed.mods.find(v => v === mod);
    }
    getShader(shd) {
        this.load();
        return this.data.installed.shaders.find(v => v === shd);
    }
    getResPack(rp) {
        this.load();
        return this.data.installed.resourcepacks.find(v => v === rp);
    }
    configureFilter(type, data) {
        this.load();
        if (!this.data.filters)
            this.data.filters = {};
        this.data.filters[type] = data;
        this.save();
    }
    getDefaultFilters(type) {
        this.load();
        if (this.data.filters && this.data.filters[type]) {
            return this.data.filters[type];
        }
        return undefined;
    }
}
exports.ModrinthModManager = ModrinthModManager;
exports.default = ModrinthModManager;
//# sourceMappingURL=manager.js.map