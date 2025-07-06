import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { ModrinthProjects } from './modrinth'
import { Logger } from '../../../tools/logger'
import { LauncherProfile } from '../../../../types/launcher'
import { ensureDir, minecraft_dir } from '../../../utils/common'
import { downloader } from '../../../utils/download'
import { ModData, ModrinthSearchParams, ModrinthSortOption, ModrinthSortOptions, ModrinthVersion, ModrinthVersionFile } from '../../../../types/modrinth'
import ModrinthModManager from './manager'
import ora from 'ora'

export class ModInstaller {
    private modrinth: ModrinthProjects;
    private pageSize = 10;

    constructor(private logger: Logger) {
        this.modrinth = new ModrinthProjects(logger);
    }

    public async configure_filters(project_type: string, version: string, loader: string, manager: ModrinthModManager, defaults?: {
        sort?: ModrinthSortOption;
        versionMatch?: 'strict' | 'match' | 'none';
        selectedCategories?: string[];
    }): Promise<{
        sort: ModrinthSortOption;
        versionFilter: string[] | undefined;
        categories: string[] | undefined;
    }> {
        const all_categories = (await this.modrinth.tags.getCategories(project_type)) || [];
        const categoryOptions = all_categories
            .filter(cat => project_type === 'mod' ? cat.name.toLowerCase() !== loader.toLowerCase() : true)
            .map(cat => ({ name: cat.name, value: cat.name }));

        const { sort } = await inquirer.prompt([
            {
                type: 'list',
                name: 'sort',
                message: '📊 Sort results by:',
                choices: ModrinthSortOptions.map(opt => ({
                    name: opt.charAt(0).toUpperCase() + opt.slice(1),
                    value: opt,
                })),
                default: defaults?.sort ?? 'relevance'
            }
        ]);

        const { versionMatch } = await inquirer.prompt([
            {
                type: 'list',
                name: 'versionMatch',
                message: '🎯 Minecraft version match strategy:',
                choices: [
                    { name: 'Strict (exact version match)', value: 'strict' },
                    { name: 'Match (minor version match)', value: 'match' },
                    { name: 'None (ignore version)', value: 'none' }
                ],
                default: defaults?.versionMatch ?? 'strict'
            }
        ]);

        let versionFilter: string[] | undefined = undefined;        
        if(versionMatch === 'strict') {
            versionFilter = [];

            versionFilter.push(version);
        } else if(versionMatch === 'match') {
            versionFilter = [];

            const matchedVersion = await this.modrinth.fetchAllMatchVersions(version);
            versionFilter.push(version);

            matchedVersion.forEach(ver => {
                if(!versionFilter?.find(v => v === ver)) {
                    versionFilter?.push(ver);
                }
            });
        }

        let categories: string[] | undefined = defaults?.selectedCategories;
        if (categoryOptions.length > 0) {
            const { selectedCategories } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedCategories',
                    message: '🧩 Select categories to filter by:',
                    choices: categoryOptions,
                    default: defaults?.selectedCategories ?? [],
                }
            ]);
            categories = selectedCategories.length > 0 ? selectedCategories : undefined;
        }

        if (project_type === 'mod' && !categories?.some(v => v.toLowerCase() === loader.toLowerCase())) {
            categories = [...(categories ?? []), loader.toLowerCase()];
        }

        const { page_limit } = await inquirer.prompt([
            {
                type: 'input',
                name: 'page_limit',
                message: '📄 How many results per page?',
                default: `${manager.getPageLimit()}`,
                filter: input => parseInt(input, 10),
                validate: input => {
                    const num = parseInt(input, 10);
                    if (isNaN(num) || num <= 0) return 'Page limit must be a positive number';
                    if (num > 100) return 'Maximum allowed is 100';
                    return true;
                }
            }
        ]);

        manager.currentPageLimit(typeof page_limit === 'string' ? parseInt(page_limit) : page_limit);

        manager.configureFilter(project_type as 'mod' | 'shader' | 'resourcepack', {
            sort,
            versionFilter,
            selectedCategories: categories
        });

        return { sort, versionFilter, categories };
    }

    public async ask_confirmation(message: string, _applyToAll: boolean = false, _default: string | undefined = undefined): Promise<{choice: 'keep' | 'replace'; applyToAll: boolean; }> {
        const { choice } = _default ? { choice: _default } : await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message,
                choices: [
                    { name: 'Keep existing file', value: 'keep' },
                    { name: 'Replace with new file', value: 'replace' }
                ],
                default: _default ?? 'keep',
            }
        ]);

        const { applyToAll } = _applyToAll ? { applyToAll: _applyToAll } : await inquirer.prompt([
            {
                type: 'confirm',
                name: 'applyToAll',
                message: 'Apply this choice to all remaining items?',
                default: false
            }
        ]);

        return { choice, applyToAll };
    }

    public async install_modrinth_content(profile: LauncherProfile): Promise<void> {
        const manager = new ModrinthModManager(profile);

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

        let page = manager.getPage();
        let mode: 'home' | 'search' = 'home';
        let query = '';
        const mcVersion = profile.lastVersionId;
        const loader = profile.origami.metadata.name.toLowerCase();

        let defaults_p = manager.getDefaultFilters(type);

        let sort_p: ModrinthSortOption = defaults_p?.sort ?? 'relevance';
        let versions_p: string[] | undefined = defaults_p?.versionFilter ?? (type === 'mod' ? [profile.lastVersionId] : undefined);
        let categories_p: string[] | undefined = defaults_p?.selectedCategories ?? (type === 'mod' ? [loader] : undefined);

        const version_folder = path.join(minecraft_dir(true), 'instances', profile.origami.path);
        const folder = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' }[type as string] || 'mods';
        const dest = path.join(version_folder, folder);
        ensureDir(dest);

        while (true) {
            console.clear();
            console.log(chalk.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (MC ${mcVersion}) — Page ${page + 1}\n`));
 
            const spinner = ora('🐾 Warming up the search engine...').start();

            this.pageSize = manager.getPageLimit();

            let searchResults;
            const commonQuery: ModrinthSearchParams = {
                query: mode === 'search' ? (query || '*') : '*',
                limit: this.pageSize,
                offset: page * this.pageSize,
                index: sort_p,
                facets: {
                    project_type: type,
                    versions: versions_p,
                    categories: categories_p,
                }
            };

            spinner.text = '🔍 Looking through Modrinth...';
            searchResults = await this.modrinth.searchProject(commonQuery);

            const hits = searchResults?.hits ?? [];
            const total = searchResults?.total_hits ?? 0;

            const choices: any[] = [];
            choices.push({ name: '[🔍 Search]', value: '__search' });
            choices.push({ name: '[🛠️  Configure Filters]', value: '__configure_filters' });

            let versions_data: ModData[] = [];

            spinner.text = `🎀 Gathering ${type} files...`;
            spinner.color = 'yellow';

            for (const hit of hits) {
                const versions = await this.modrinth.versions.fetchVersions(
                    hit.project_id,
                    type === 'mod' ? [loader] : undefined,
                    versions_p
                );

                const isInstalled = versions?.find(v => v.files.find(f => manager.getFromType(f.filename, type)));
                const file = isInstalled ? isInstalled.files.find(f => manager.getFromType(f.filename, type)) : undefined

                if (versions) {
                    versions_data.push({ hit: hit.project_id, is_installed: isInstalled, specific: file, versions });
                } else {
                    versions_data.push({ hit: hit.project_id, is_installed: undefined, specific: undefined, versions: [] });
                }

                const displayName = isInstalled
                    ? chalk.italic.underline(`${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`)
                    : `${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`;

                choices.push({ name: displayName, value: hit.project_id });
            }

            if (page > 0) choices.push({ name: '⬅ Previous page', value: '__prev' });
            if ((page + 1) * this.pageSize < total) choices.push({ name: '➡ Next page', value: '__next' });
            choices.push({ name: '🔙 Back', value: '__back' });

            spinner.succeed('Done');

            const { selected } = await inquirer.prompt({
                type: 'list',
                name: 'selected',
                message: 'Select an option:',
                choices,
                loop: false,
            });

            if (selected === '__back') break;
            if (selected === '__next') { page++; manager.currentPage(page); continue; }
            if (selected === '__prev') { page--; manager.currentPage(page); continue; }
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
            if (selected === '__configure_filters') {
                let results = await this.configure_filters(type, profile.lastVersionId, loader, manager, {
                    sort: sort_p,
                    versionMatch: (versions_p?.length || 0) < 1 ? 'none' : versions_p?.length === 1 ? 'strict' : 'match',
                    selectedCategories: categories_p
                });

                versions_p = results.versionFilter;
                sort_p = results.sort;
                categories_p = results.categories;
                continue;
            }

            let version_data = versions_data.find(v => v.hit === selected);
            await this.handleProjectInstall(version_data?.versions, type, profile, dest, version_data, manager);
            break;
        }
    }

    private async handleProjectInstall(
        versions_raw: ModrinthVersion[] | undefined,
        type: 'mod' | 'resourcepack' | 'shader',
        profile: LauncherProfile,
        dest: string,
        data: ModData | undefined,
        manager: ModrinthModManager,
    ) {
        console.clear();
        console.log(chalk.bold('🔄 Fetching versions...'));

        const versions = versions_raw;
    
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
        
        let main_apply_to_all = false;
        let main_default: string | undefined = undefined;

        if (data?.is_installed && data?.specific && fs.existsSync(path.join(dest, data.specific.filename))) {
            const confirm = await this.ask_confirmation(`You've already installed mod version '${data.specific.filename}'. What do you want to do?`, main_apply_to_all, main_default);

            if(confirm.applyToAll) {
                main_apply_to_all = confirm.applyToAll;
                main_default = confirm.choice;
            };

            if(confirm.choice === 'replace') {
                const fullPath = path.join(dest, data.specific.filename);
                fs.unlinkSync(fullPath);
                this.logger.log(chalk.yellow(`🗑 Removed old version: ${data.specific.filename}`));
                manager.deleteFromType(data.specific.filename, type);

                await downloadMod(file, this.logger, type);
            } else if (confirm.choice === 'keep') {
                this.logger.log(chalk.gray(`⏭️ Skipped: ${data.specific.filename} (already installed)`));
            }
        } else await downloadMod(file, this.logger, type);

        async function downloadMod(file: ModrinthVersionFile, logger: Logger, type: 'mod' | 'resourcepack' | 'shader') {
            const filename = file.filename;
            const outPath = path.join(dest, filename);

            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

            logger.log(chalk.green(`📥 Downloading ${filename}...`));
            await downloader(file.url, outPath);
            logger.log(chalk.green(`✅ Installed ${filename} to ${type}s folder.`));
        
            manager.addFromType(filename, type);
        };

        let deps_apply_to_all = false;
        let deps_default: string | undefined = undefined;

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
                type === 'mod' ? [profile.origami.metadata.name.toLowerCase()] : undefined,
                selectedVersion.game_versions
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

            const isInstalled = depVersions?.find(v => v.files.find(f => manager.getFromType(f.filename, type)));
            const file = isInstalled ? isInstalled.files.find(f => manager.getFromType(f.filename, type)) : undefined

            if (isInstalled && file && fs.existsSync(path.join(dest, file.filename))) {
                const confirm = await this.ask_confirmation(`You've already installed mod version '${file.filename}'. What do you want to do?`, deps_apply_to_all, deps_default);

                if(confirm.applyToAll) {
                    deps_apply_to_all = confirm.applyToAll;
                    deps_default = confirm.choice;
                };

                if(confirm.choice === 'replace') {
                    const fullPath = path.join(dest, file.filename);
                    fs.unlinkSync(fullPath);
                    this.logger.log(chalk.yellow(`🗑 Removed old version: ${file.filename}`));
                    manager.deleteFromType(file.filename, type);

                    await downloadMod(depFile, this.logger, type);
                } else if (confirm.choice === 'keep') {
                    this.logger.log(chalk.gray(`⏭️ Skipped: ${file.filename} (already installed)`));
                }
            } else await downloadMod(depFile, this.logger, type);
        }
    }
}