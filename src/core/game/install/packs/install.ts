import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { ModrinthProjects } from './modrinth'
import { Logger } from '../../../tools/logger'
import { LauncherProfile } from '../../../../types/launcher'
import { ensureDir, minecraft_dir } from '../../../utils/common'
import { downloader } from '../../../utils/download'
import { ModrinthSearchHit, ModrinthSearchParams } from '../../../../types/modrinth'

export class ModInstaller {
    private modrinth: ModrinthProjects;
    private pageSize = 10;

    constructor(private logger: Logger) {
        this.modrinth = new ModrinthProjects(logger);
    }

    public async install_modrinth_content(profile: LauncherProfile): Promise<void> {
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '📦 Select content type:',
            choices: [
                { name: 'Mods', value: 'mod' },
                { name: 'Resource Packs', value: 'resourcepack' },
                { name: 'Shaders', value: 'shader' }
            ]
        });

        let page = 0;
        let mode: 'home' | 'search' = 'home';
        let query = '';
        const mcVersion = profile.lastVersionId;
        const loader = profile.origami.metadata.name.toLowerCase();

        const version_folder = path.join(minecraft_dir(true), 'instances', profile.origami.path);
        const folder = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' }[type as string] || 'mods';
        const dest = path.join(version_folder, folder);
        ensureDir(dest);
        const installedFiles = new Set(fs.readdirSync(dest));

        while (true) {
            console.clear();
            console.log(chalk.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (MC ${mcVersion}) — Page ${page + 1}\n`));

            let searchResults;
            const commonQuery: ModrinthSearchParams = {
                query: mode === 'search' ? (query || '*') : '*',
                limit: this.pageSize,
                offset: page * this.pageSize,
                index: 'relevance',
                facets: {
                    project_type: type,
                    versions: type === "mod" ? [mcVersion] : undefined,
                    categories: type === "mod" ? [loader] : undefined,
                }
            };

            searchResults = await this.modrinth.searchProject(commonQuery);

            const hits = searchResults?.hits ?? [];
            const total = searchResults?.total_hits ?? 0;

            const choices: any[] = [];
            choices.push({ name: '[🔍 Search]', value: '__search' });

            for (const hit of hits) {
                const isInstalled = installedFiles.has(`${hit.project_id}-${hit.title}-${hit.slug}.jar`)

                const displayName = isInstalled
                    ? chalk.italic(`${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`)
                    : `${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`;

                choices.push({ name: displayName, value: hit.project_id });
            }

            if (page > 0) choices.push({ name: '⬅ Previous page', value: '__prev' });
            if ((page + 1) * this.pageSize < total) choices.push({ name: '➡ Next page', value: '__next' });
            choices.push({ name: '🔙 Back', value: '__back' });

            const { selected } = await inquirer.prompt({
                type: 'list',
                name: 'selected',
                message: 'Select an option:',
                choices,
                loop: false,
            });

            if (selected === '__back') break;
            if (selected === '__next') { page++; continue; }
            if (selected === '__prev') { page--; continue; }
            if (selected === '__search') {
                mode = 'search';
                const resp = await inquirer.prompt({
                    type: 'input',
                    name: 'query',
                    message: `Search for ${type}s:`,
                    default: query
                });
                query = resp.query;
                page = 0;
                continue;
            }

            let data = hits.find(v => v.project_id === selected) || hits[0];
            await this.handleProjectInstall(selected, type, mcVersion, profile, dest, data);
            break;
        }
    }

    private async handleProjectInstall(
        projectId: string,
        type: 'mod' | 'resourcepack' | 'shader',
        mcVersion: string,
        profile: LauncherProfile,
        dest: string,
        data: ModrinthSearchHit
    ) {
        console.clear();
        console.log(chalk.bold('🔄 Fetching versions...'));

        const versions = await this.modrinth.versions.fetchVersions(
            projectId,
            type === 'mod' ? [profile.origami.metadata.name.toLowerCase()] : undefined,
            type === 'mod' ? [mcVersion] : undefined,
            type === 'mod' ? true : undefined
        );

        if (!versions?.length) {
            console.log(chalk.red('❌ No compatible versions found.'));
            return;
        }

        const versionChoices = versions.map(v => ({
            name: `${v.name} (${v.version_number})`,
            value: v
        }));

        const { selectedVersion } = await inquirer.prompt({
            type: 'list',
            name: 'selectedVersion',
            message: 'Select version to install:',
            choices: versionChoices,
            loop: false,
        });

        const file = selectedVersion.files.find((f: any) => f.primary) || selectedVersion.files[0];
        if (!file) {
            console.log(chalk.red('❌ No downloadable file found.'));
            return;
        }

        const filename = type === 'mod' ? `${data.project_id}-${data.title}-${data.slug}.jar` : file.filename;
        const outPath = path.join(dest, filename);

        const filesInFolder = fs.readdirSync(dest);
        if (filesInFolder.find(v => v === filename)) {
            const fullPath = path.join(dest, filename);
            fs.unlinkSync(fullPath);
            this.logger.log(chalk.yellow(`🗑 Removed old version: ${filename}`));
        }

        this.logger.log(chalk.green(`📥 Downloading ${filename}...`));
        await downloader(file.url, outPath);
        this.logger.log(chalk.green(`✅ Installed ${filename} to ${type}s folder.`));

        for (const dep of selectedVersion.dependencies) {
            if (dep.dependency_type !== 'required') continue;

            const depProject = await this.modrinth.getProject(dep.project_id);
            if (!depProject) {
                this.logger.log(chalk.yellow(`⚠️  Skipped missing dependency: ${dep.project_id}`));
                continue;
            }

            this.logger.log(chalk.blue(`📦 Installing dependency: ${depProject.title}`));
            
            const depVersions = await this.modrinth.versions.fetchVersions(
                dep.project_id,
                [profile.origami.metadata.name.toLowerCase()],
                [mcVersion],
                true
            );

            if (!depVersions?.length) {
                this.logger.log(chalk.red(`❌ No compatible version found for dependency: ${depProject.title}`));
                continue;
            }

            const depFile = depVersions[0].files.find(f => f.primary) || depVersions[0].files[0];
            if (!depFile) {
                this.logger.log(chalk.red(`❌ No file found for dependency: ${depProject.title}`));
                continue;
            }

            const depFilename = `${depProject.id}-${depProject.title}-${depProject.slug}.jar`;
            const depPath = path.join(dest, depFilename);

            if (fs.existsSync(depPath)) fs.unlinkSync(depPath);

            this.logger.log(chalk.green(`📥 Downloading dependency ${depFile.filename}...`));
            await downloader(depFile.url, depPath);
            this.logger.log(chalk.green(`✅ Installed dependency: ${depFile.filename}`));
        }
    }
}