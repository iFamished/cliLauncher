import * as fs from 'fs';
import * as path from 'path';
import { minecraft_dir } from '../utils/common';
import { LauncherProfiles, LauncherProfile, Metadata } from '../../types/launcher';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readJsonSync } from 'fs-extra';
import { v4 } from 'uuid';

const mcDir = minecraft_dir(true);
const launcherProfilesPath = path.join(mcDir, 'profiles.json');

export class LauncherProfileManager {
    private filePath: string;
    private data: LauncherProfiles;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { origami_profiles: {} };
        this.load();
        this.autoImportVanillaProfiles();
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
                const versionJson = readJsonSync(versionJsonPath);
                const name = folder;
                const id = versionJson.id || versionJson.inheritsFrom || 'Origami-Imported-'+v4();

                if (!this.data.origami_profiles[name]) {
                    this.addProfile(
                        name,
                        id,
                        path.join(versionsDir, folder),
                        {
                            name: id,
                            description: versionJson.type || folder,
                            author: 'OrigamiImportSystem'
                        },
                        id,
                        'Grass',
                        true,
                    );
                    console.log(chalk.gray(`✔ Imported version: ${id}`));
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
                path: version_path
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
        if (selectedProfile) {
            this.selectProfile(selectedId);
            console.log(chalk.green(`✨ Selected profile: ${selectedProfile.name}`));
        }

        return selectedProfile ?? null;
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
