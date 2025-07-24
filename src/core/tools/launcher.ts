import * as fs from 'fs';
import * as path from 'path';
import { minecraft_dir } from '../utils/common';
import { LauncherProfiles, LauncherProfile, Metadata } from '../../types/launcher';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readJsonSync } from 'fs-extra';
import { v4 } from 'uuid';

import forge from '../game/install/mod_loaders/forge';
import neoforge from '../game/install/mod_loaders/neo_forge';
import fabric from '../game/install/mod_loaders/fabric';
import quilt from '../game/install/mod_loaders/quilt';
import vanilla from '../game/install/vanilla';
import LauncherOptionsManager from '../game/launch/options';

const mcDir = minecraft_dir(true);

const launcherProfilesPath = path.join(mcDir, 'profiles.json');
const legacy_210_profiles = path.join(minecraft_dir(), 'origami_files', 'profiles.json');

export class LauncherProfileManager {
    private filePath: string;
    private data: LauncherProfiles;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;

        if(fs.existsSync(legacy_210_profiles)) {
            fs.writeFileSync(filePath, fs.readFileSync(legacy_210_profiles));
            
            setTimeout(() => fs.unlinkSync(legacy_210_profiles), 500);
        }
        
        this.data = { origami_profiles: {} };
        this.load();
        this.autoImportVanillaProfiles();
    }

    public fetchMetadata(folder: string, versionJsonPath: string): { version: string, metadata: Metadata } {
        const name = folder.toLowerCase();
        const versionJson = readJsonSync(versionJsonPath);
        const id =  versionJson.inheritsFrom || versionJson.id || 'Origami-Imported-'+v4();

        if(name.includes('forge')) {
            return { version: id, metadata: forge.metadata }
        } else if(name.includes('neoforge')) {
            return { version: id, metadata: neoforge.metadata }
        } else if(name.includes('fabric')) {
            return { version: id, metadata: fabric.metadata }
        } else if(name.includes('quilt')) {
            return { version: id, metadata: quilt.metadata }
        } else {
            return { version: id, metadata: vanilla.metadata }
        }
    };

    private cleanupProfiles() {
        const versionsDir = path.join(minecraft_dir(), 'versions');

        const removed: string[] = [];

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
            console.log(chalk.gray(`🧹 Cleaned up ${removed.length} invalid profile(s): ${removed.join(", ")}`));
            this.save();
        }
    }

    public autoImportVanillaProfiles() {
        const versionsDir = path.join(minecraft_dir(), 'versions');
        if (!fs.existsSync(versionsDir)) return;

        const folders = fs.readdirSync(versionsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folder of folders) {
            const versionJsonPath = path.join(versionsDir, folder, `${folder}.json`);

            if (!fs.existsSync(versionJsonPath)) continue;

            try {
                const name = folder;
                const manifest = this.fetchMetadata(name, versionJsonPath);

                if (!this.data.origami_profiles[name] || !Object.values(this.data.origami_profiles).find(v => v.name === name)) {
                    this.addProfile(name, manifest.version, name, manifest.metadata, name, manifest.metadata.name);
                    console.log(chalk.gray(`✔ Imported version: ${name}`));
                }
            } catch (e) {
                console.warn(chalk.red(`⚠️ Failed to parse version JSON: ${folder}`));
            }
        }
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.cleanupProfiles(); 
            } catch (err) {
                console.error('Failed to parse launcher_profiles.json:', err);
            }
        } else {
            this.save();
        }
    }

    private save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    reset() {
        fs.writeFileSync(this.filePath, JSON.stringify({ origami_profiles: {} }, null, 2));
    }

    getJvm(id: string) {
        let profile = this.getProfile(id);
        if(!profile) return '';

        return profile.origami.jvm;
    }

    editJvm(id: string, jvm: string) {
        let profile = this.getProfile(id);
        if(!profile) return '';

        this.data.origami_profiles[id].origami.jvm = jvm;
        this.save();

        return jvm;
    }

    addProfile(id: string, versionId: string, version_path: string, metadata: Metadata, name?: string, icon?: string, donot_auto_add?: boolean) {
        this.load();

        const now = new Date().toISOString();
        const profile: LauncherProfile = {
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

        if(!donot_auto_add) this.selectProfile(id);
    }

    deleteProfile(id: string) {
        this.load();

        if (this.data.origami_profiles[id]) {
            delete this.data.origami_profiles[id];

            if (this.data.selectedProfile === id) {
                this.data.selectedProfile = undefined;
            }

            this.save();
        }
    }

    selectProfile(id: string) {
        this.load();

        if (this.data.origami_profiles[id]) {
            this.data.selectedProfile = id;
            this.data.origami_profiles[id].lastUsed = new Date().toISOString();
            this.save();
        } else {
            console.warn(`Profile "${id}" does not exist.`);
        }
    }

    async chooseProfile(): Promise<LauncherProfile | null> {
        this.load();

        const profileIds = Object.keys(this.data.origami_profiles);
        if (profileIds.length === 0) {
            console.log(chalk.red("❌ No profiles available."));
            return null;
        }

        const choices = profileIds.map((id) => {
            const profile = this.data.origami_profiles[id];
            const meta = profile.origami.metadata;

            const name = chalk.hex("#c4b5fd")(profile.name);
            const version = chalk.green(`[${profile.lastVersionId}]`);
            const author = chalk.yellow(meta.author || "unknown");
            const desc = chalk.gray(meta.description || "No description");

            return {
                name: `${version} ${name} ${chalk.gray('by')} ${author} - ${desc}`,
                value: id
            };
        });

        const { selectedId } = await inquirer.prompt([
            {
                type: "list",
                name: "selectedId",
                message: chalk.hex("#f472b6")("🌸 Pick a profile to use:"),
                choices,
                loop: false
            }
        ]);

        const selectedProfile = this.getProfile(selectedId);
        if (!selectedProfile) {
            console.log(chalk.red("❌ Invalid profile selected."));
            return null;
        }

        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: chalk.cyanBright(`📦 What would you like to do with "${selectedProfile.name}"?`),
                choices: [
                    { name: '✅ Select as current profile', value: 'select' },
                    { name: '⚙️  Configure profile', value: 'configure' },
                    new inquirer.Separator(),
                    { name: '❌ Cancel', value: 'cancel' }
                ]
            }
        ]);

        switch (action) {
            case 'select':
                this.selectProfile(selectedId);
                console.log(chalk.green(`✨ Selected profile: ${selectedProfile.name}`));
                return selectedProfile;

            case 'configure':
                const optionsManager = new LauncherOptionsManager();
                optionsManager.setProfile(selectedProfile);
                await optionsManager.configureOptions();
                return selectedProfile;

            case 'cancel':
            default:
                console.log(chalk.yellow('🚫 Cancelled.'));
                return null;
        }
    }

    listProfiles(): string[] {
        this.load();

        return Object.keys(this.data.origami_profiles);
    }

    getProfile(id: string): LauncherProfile | undefined {
        this.load();

        return this.data.origami_profiles[id];
    }

    getSelectedProfile(): LauncherProfile | undefined {
        this.load();
        
        return this.getProfile(this.data.selectedProfile || "");
    }
}

export default LauncherProfileManager;
