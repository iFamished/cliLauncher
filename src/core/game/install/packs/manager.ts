import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { Filters, InstalledProfile, ModProfile, ModrinthSortOption } from '../../../../types/modrinth';
import { minecraft_dir } from '../../../utils/common';
import { LauncherProfile } from '../../../../types/launcher';

const mcDir = minecraft_dir(true);

export class ModrinthModManager {
    private filePath: string;
    private versionPath: string;
    private data: ModProfile;

    constructor(profile: LauncherProfile) {
        this.versionPath = path.join(mcDir, 'instances', profile.origami.path);
        this.filePath = path.join(this.versionPath, 'origami_installs.json');

        if(!fs.existsSync(this.versionPath)) fs.mkdirSync(this.versionPath, { recursive: true });
        if(!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '{}');

        this.data = { version: this.versionPath, installed: { mods: [], shaders: [], resourcepacks: [] }, disabled: [] };
        this.load();
        this.cleanup_mods(); 
        this.auto_import_mods();
    }

    private cleanup_mods() {
        const mods_folder = path.join(this.versionPath, 'mods');
        const removed: string[] = [];

        for (const mod of this.data.installed.mods) {
            const mod_file = path.join(mods_folder, mod);
            const disabled_mod_file = path.join(mods_folder, mod.replace(/\.jar$/, '.jar.disabled'));

            if (!fs.existsSync(mod_file) && !fs.existsSync(disabled_mod_file)) {
                removed.push(mod);
                this.deleteMod(mod);
            }
        }

        if (removed.length > 0) {
            console.log(chalk.gray(`🧹 Cleaned up ${removed.length} invalid mods(s): ${removed.join(", ")}`));
            this.save();
        }
    }

    public auto_import_mods() {
        const modsDir = path.join(this.versionPath, 'mods');
        if (!fs.existsSync(modsDir)) return;

        const mods = fs.readdirSync(modsDir, { withFileTypes: true })
            .filter(dirent => !dirent.isDirectory() && (dirent.name.endsWith('.jar') || dirent.name.endsWith('.jar.disabled')))
            .map(dirent => dirent.name);

        for (const mod of mods) {
            if(mod.endsWith('.jar.disabled')) {
                let mod_name = mod.replaceAll('.jar.disabled', '.jar');

                if (!this.getMod(mod_name)) {
                    this.addMod(mod_name);
                }

                console.log(chalk.gray(`✔ Imported disabled mod: ${mod}`));
            } else if (!this.getMod(mod)) {
                this.addMod(mod);
                console.log(chalk.gray(`✔ Imported mod: ${mod}`));
            };
        }

        const shaderDir = path.join(this.versionPath, 'shaderpacks');
        if (!fs.existsSync(shaderDir)) return;

        const shaders = fs.readdirSync(shaderDir, { withFileTypes: true }).map(dirent => dirent.name);

        for (const shader of shaders) {
            if (!this.getShader(shader)) {
                this.addShader(shader);
                console.log(chalk.gray(`✔ Imported shaders: ${shader}`));
            }
        }

        const resPackDir = path.join(this.versionPath, 'resourcepacks');
        if (!fs.existsSync(resPackDir)) return;

        const respacks = fs.readdirSync(resPackDir, { withFileTypes: true }).map(dirent => dirent.name);

        for (const respack of respacks) {
            if (!this.getResPack(respack)) {
                this.addResPack(respack);
                console.log(chalk.gray(`✔ Imported resource pack: ${respack}`));
            }
        }
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            } catch (err) {
                console.error('Failed to parse origami_mods.json:', err);
            }
        } else {
            this.save();
        }
    }

    private save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    reset() {
        fs.unlinkSync(this.filePath);

        const modsDir = path.join(this.versionPath, 'mods');
        const shaderDir = path.join(this.versionPath, 'shaderpacks');
        const resPackDir = path.join(this.versionPath, 'resourcepacks');

        if(fs.existsSync(modsDir)) {
            fs.rmSync(modsDir, { recursive: true, force: true })
        };

        if(fs.existsSync(shaderDir)) {
            fs.rmSync(shaderDir, { recursive: true, force: true })
        };

        if(fs.existsSync(resPackDir)) {
            fs.rmSync(resPackDir, { recursive: true, force: true })
        };
    }

    addMod(mod: string) {
        this.load();

        if(!this.getMod(mod)) this.data.installed.mods.push(mod);

        this.save();
    }

    deleteMod(mod: string) {
        this.load();

        if (this.getMod(mod)) {
            if(this.isModDisabled(mod)) {
                this.enableMod(mod);
            }

            let file = this.getMod(mod);
            let full_path = path.join(this.versionPath, 'mods', file || '');

            if(file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }

            this.data.installed.mods = this.data.installed.mods.filter(md => md !== mod);

            this.save();
        }
    }

    addShader(shader: string) {
        this.load();

        if(!this.getShader(shader)) this.data.installed.shaders.push(shader);

        this.save();
    }

    deleteShader(shader: string) {
        this.load();

        if (this.getShader(shader)) {
            let file = this.getShader(shader);
            let full_path = path.join(this.versionPath, 'shaderpacks', file || '');

            if(file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }

            this.data.installed.shaders = this.data.installed.shaders.filter(sh => sh !== shader);
            this.save();
        }
    }

    addResPack(respack: string) {
        this.load();

        if(!this.getResPack(respack)) this.data.installed.resourcepacks.push(respack);

        this.save();
    }

    deleteResPack(respack: string) {
        this.load();

        if (this.getResPack(respack)) {
            let file = this.getResPack(respack);
            let full_path = path.join(this.versionPath, 'resourcepacks', file || '');

            if(file && fs.existsSync(full_path)) {
                fs.unlinkSync(full_path);
            }

            this.data.installed.resourcepacks = this.data.installed.resourcepacks.filter(rp => rp !== respack);
            this.save();
        }
    }

    isModDisabled(mod: string) {
        return this.getMod(mod) && this.getDisabledMod(mod);
    }

    getDisabledMod(mod: string) {
        return this.data.disabled.find(v => v === mod);
    }

    disableMod(mod: string) {
        this.load();

        const mods = path.join(this.versionPath, 'mods');

        if (!this.getMod(mod) || this.isModDisabled(mod)) return;

        const modPath = path.join(mods, mod);
        const disabledPath = path.join(mods, mod.replace(/\.jar$/, '.jar.disabled'));

        if (!fs.existsSync(modPath)) return;
        if (fs.existsSync(disabledPath)) fs.unlinkSync(disabledPath);

        fs.renameSync(modPath, disabledPath);
        this.data.disabled.push(mod);
        this.save();
    }

    enableMod(mod: string) {
        this.load();

        const mods = path.join(this.versionPath, 'mods');

        if (!this.getMod(mod) || !this.getDisabledMod(mod)) return;

        const disabledModPath = path.join(mods, mod.replace(/\.jar$/, '.jar.disabled'));
        const enabledModPath = path.join(mods, mod);

        if (!fs.existsSync(disabledModPath)) return;
        if (fs.existsSync(enabledModPath)) fs.unlinkSync(enabledModPath);

        fs.renameSync(disabledModPath, enabledModPath);

        const index = this.data.disabled.indexOf(mod);
        if (index !== -1) this.data.disabled.splice(index, 1);
        this.save();
    }

    getList(): InstalledProfile {
        this.load();

        return this.data.installed;
    }

    getFromType(name: string, type: 'mod' | 'resourcepack' | 'shader') {
        if(type === 'mod') return this.getMod(name)
        else if(type === 'resourcepack') return this.getResPack(name)
        else if(type === 'shader') return this.getShader(name)
        else return;
    }

    deleteFromType(name: string, type: 'mod' | 'resourcepack' | 'shader') {
        if(type === 'mod') return this.deleteMod(name)
        else if(type === 'resourcepack') return this.deleteResPack(name)
        else if(type === 'shader') return this.deleteShader(name)
        else return;
    }

    addFromType(name: string, type: 'mod' | 'resourcepack' | 'shader') {
        if(type === 'mod') return this.addMod(name)
        else if(type === 'resourcepack') return this.deleteResPack(name)
        else if(type === 'shader') return this.deleteShader(name)
        else return;
    }

    getMod(mod: string): string | undefined {
        this.load();
        return this.data.installed.mods.find(v => v === mod);
    }

    getShader(shd: string): string | undefined {
        this.load();
        return this.data.installed.shaders.find(v => v === shd);
    }

    getResPack(rp: string): string | undefined {
        this.load();
        return this.data.installed.resourcepacks.find(v => v === rp);
    }

    configureFilter(type: 'mod' | 'shader' | 'resourcepack', data: {
        sort?: ModrinthSortOption;
        versionFilter?: string[];
        selectedCategories?: string[];
    }) {
        this.load();

        if(!this.data.filters) this.data.filters = {};

        this.data.filters[type] = data;

        this.save();
    }

    getDefaultFilters(type: 'mod' | 'shader' | 'resourcepack'): Filters | undefined {
        this.load();

        if(this.data.filters && this.data.filters[type]) {
            return this.data.filters[type];
        }

        return undefined;
    }
}

export default ModrinthModManager;