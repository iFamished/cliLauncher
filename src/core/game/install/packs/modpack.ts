import inquirer from 'inquirer'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { ModrinthProjects } from './modrinth'
import { Logger, logPopupError } from '../../../tools/logger'
import { LauncherProfile } from '../../../../types/launcher'
import { async_minecraft_data_dir, cleanDir, ensureDir, extractZip, jsonParser, limitedAll, localpath, minecraft_dir, moveFolderContents, sanitizePathSegment } from '../../../utils/common'
import { downloadAsync, downloader } from '../../../utils/download'
import { ModpackData, ModrinthModpackIndex, ModrinthSearchParams, ModrinthSortOption, ModrinthSortOptions, ModrinthVersion, } from '../../../../types/modrinth'
import ora from 'ora'
import LauncherProfileManager from '../../../tools/launcher'
import { emptyDirSync, pathExists } from 'fs-extra'
import { get, set } from '../../../tools/data_manager'
import { fetchMinecraftVersionManifest } from '../../../utils/minecraft_versions'
import { InstallerRegistry } from '../registry'
import AdmZip from 'adm-zip'
import { readFile, writeFile } from 'fs/promises'
import LauncherOptionsManager from '../../launch/options'
import pLimit from 'p-limit'
import { progress } from '../../launch/handler'
import EventEmitter from 'events'
import { Agent } from 'https'

export class ModpackInstaller {
    private modrinth: ModrinthProjects;
    private pageSize = 10;

    constructor(private logger: Logger) {
        this.modrinth = new ModrinthProjects(logger);
    }

    public async configure_filters(
        project_type: string
    ): Promise<{
        sort: ModrinthSortOption;
        categories: string[] | undefined;
        loader: string | undefined;
        page_limit: number;
    }> {
        const stored = get('search:filters') ?? { selectedCategories: ['loader:fabric'] };
        const storedPageLimit = get('search:page_limit') ?? 20;

        const currentSort: ModrinthSortOption = stored.sort ?? 'relevance';
        const currentCategories: string[] = stored.selectedCategories ?? [];

        const currentLoader = currentCategories.find(v => v.startsWith('loader:'))?.split(':')[1];
        const selectedCategories = currentCategories.filter(v => !v.startsWith('loader:'));

        const rawCategories = await this.modrinth.tags.getCategories(project_type) ?? [];
        const loaderOptions = new InstallerRegistry()
            .list()
            .filter(v => v !== 'vanilla')
            .map(v => ({ name: v, value: v }));

        const categoryOptions = rawCategories.map(v => ({ name: v.name, value: v.name }));

        const { configureWhat } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'configureWhat',
                message: '🛠️ What would you like to configure?',
                choices: [
                    { name: `Sort (${currentSort})`, value: 'sort' },
                    { name: `Categories (${selectedCategories.join(', ') || 'none'})`, value: 'categories' },
                    { name: `Loader (${currentLoader || 'fabric'})`, value: 'loader' },
                    { name: `Page Limit (${storedPageLimit})`, value: 'page_limit' },
                ],
            }
        ]);

        let sort = currentSort;
        let categories = selectedCategories;
        let loader = currentLoader;
        let page_limit = storedPageLimit;

        if (configureWhat.includes('sort')) {
            const { sort: newSort } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'sort',
                    message: '📊 Sort results by:',
                    choices: ModrinthSortOptions.map(opt => ({
                        name: opt.charAt(0).toUpperCase() + opt.slice(1),
                        value: opt,
                    })),
                    default: sort,
                    loop: false,
                }
            ]);
            sort = newSort;
        }

        if (configureWhat.includes('categories')) {
            const { categories: newCategories } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'categories',
                    message: '🧩 Select categories to filter by:',
                    choices: categoryOptions,
                    default: categories,
                    loop: false,
                }
            ]);
            categories = newCategories;
        }

        if (configureWhat.includes('loader')) {
            const { loader: selectedLoader } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'loader',
                    message: '🔌 Choose a loader:',
                    choices: loaderOptions,
                    default: loader,
                }
            ]);
            loader = selectedLoader;
        }

        if (configureWhat.includes('page_limit')) {
            const { page_limit: newPageLimit } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'page_limit',
                    message: '📄 How many results per page?',
                    default: page_limit,
                    filter: input => parseInt(input, 10),
                    validate: input => {
                        const num = parseInt(input, 10);
                        if (isNaN(num) || num <= 0) return 'Page limit must be a positive number';
                        if (num > 100) return 'Maximum allowed is 100';
                        return true;
                    }
                }
            ]);
            page_limit = newPageLimit;
            set('search:page_limit', page_limit);
        }

        const finalCategories = categories.concat(loader ? [`loader:${loader}`] : []);

        set('search:filters', {
            sort,
            selectedCategories: finalCategories,
        });

        return { sort, categories, loader, page_limit };
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

    public async install_modrinth_content(): Promise<void> {
        const manager = new LauncherProfileManager();
        const type = 'modpack';

        let page = parseInt(String(get('search:page') || '0'));
        let mode: 'home' | 'search' = 'home';
        let query = '';

        while (true) {
            let defaults_p = get('search:filters');

            let sort_p: ModrinthSortOption = defaults_p?.sort ?? 'relevance';
            let categories_p: string[] | undefined = defaults_p?.selectedCategories || ['loader:fabric'];

            console.clear();
            console.log(chalk.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (Page ${page + 1})\n`));
 
            const spinner = ora('🐾 Warming up the search engine...').start();

            this.pageSize = parseInt(String(get('search:page_limit') || '10'));

            let searchResults;

            const categories = categories_p ? categories_p.filter(v => !v.startsWith('loader:')) : undefined;
            const loaders = categories_p ? categories_p.filter(v => v.startsWith('loader:')).map(v => v.split(':')[1]) : undefined;

            const commonQuery: ModrinthSearchParams = {
                query: mode === 'search' ? (query || '*') : '*',
                limit: this.pageSize,
                offset: page * this.pageSize,
                index: sort_p,
                facets: {
                    project_type: [type],
                    categories,
                    loaders,
                },
            };

            spinner.text = '🔍 Looking through Modrinth...';
            searchResults = await this.modrinth.searchProject(commonQuery);

            const hits = searchResults?.hits ?? [];
            const total = searchResults?.total_hits ?? 0;

            const choices: any[] = [];
            choices.push({ name: '[🔍 Search]', value: '__search' });
            choices.push({ name: '[🛠️  Configure Filters]', value: '__configure_filters' });

            let versions_data: ModpackData[] = [];

            spinner.text = `🎀 Gathering ${type} files...`;
            spinner.color = 'yellow';

            for (const hit of hits) {
                let versions = await this.modrinth.versions.fetchVersions(
                    hit.project_id,
                    loaders,
                    void 0,
                );

                let isInstalled = versions?.find(ver => manager.getProfile(sanitizePathSegment(`${hit.title} - ${ver.name}`))) ? true : false;
                let supports_loader = versions?.some(v =>
                    v.loaders.length === 1 &&
                    v.loaders.some(loader => loaders?.includes(loader))
                );
                if (!supports_loader) return;

                versions = versions?.filter(v =>
                    v.loaders.length === 1 &&
                    v.loaders.some(loader => loaders?.includes(loader))
                ) || null;

                if (versions) {
                    versions_data.push({ hit, is_installed: isInstalled, versions });
                } else {
                    versions_data.push({ hit, is_installed: false, versions: [] });
                }

                const displayName = isInstalled
                    ? chalk.italic.underline(`${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()} — ${hit.description}`)
                    : `${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()} — ${hit.description}`;

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
            if (selected === '__next') { page++; set('search:page', page); continue; }
            if (selected === '__prev') { page--; set('search:page', page); continue; }
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
                await this.configure_filters(type);
                continue;
            }

            const version_data = versions_data.find(v => v.hit.project_id === selected);
            if(!version_data) {
                await logPopupError('Modrinth Error', '❌ No compatible versions found.');
                return;
            };

            console.clear();
            console.log(chalk.bold('🔄 Fetching versions...'));

            const versions = version_data.versions;
        
            if (!versions.length) {
                await logPopupError('Modrinth Error', chalk.red('❌ No compatible versions found.'), true);
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

            const file = selectedVersion.files.filter((f: any) => f.filename.endsWith('.mrpack')).find((f: any) => f.primary) || selectedVersion.files[0];
            if (!file) {
                await logPopupError('Modrinth Error', chalk.red('❌ No downloadable file found.'), true);
                return;
            }
        
            await this.handleModpackInstall(selectedVersion, version_data, loaders?.length ? loaders[0] : 'fabric');
            break;
        }
    }

    private async handleModpackInstall(selected: ModrinthVersion, data: ModpackData, loader: string) {
        const modpackFile = selected.files.find(f => f.primary) || selected.files[0];
        const loader_provider = new InstallerRegistry().get(loader);
        const launcher_profiles = new LauncherProfileManager();

        if (!modpackFile || !loader_provider) {
            await logPopupError('Modrinth Error', chalk.red('❌ No valid modpack file found or invalid loader.'), true);
            return;
        }

        const version = selected.game_versions[0] || (await fetchMinecraftVersionManifest()).latest.release;
        const profileId = sanitizePathSegment(`${data.hit.title} - ${selected.name}`);

        const modpackFolder = path.join(minecraft_dir(), 'versions', profileId);
        const modpackPath = path.join(modpackFolder, modpackFile.filename);

        if (data?.is_installed && fs.existsSync(modpackFolder) && fs.statSync(modpackFolder).isDirectory()) {
            await logPopupError('Modpack Error',
                `🌸 Oopsie~! It looks like the modpack **"${modpackFile.filename}"** is already tucked safely in your files!\n\n` +
                `✨ If you want to reinstall it, you'll need to delete the old version manually!`, true);
            return;
        }

        if (fs.existsSync(modpackFolder)) fs.rmSync(modpackFolder, { recursive: true, force: true });
        emptyDirSync(modpackFolder);

        try {
            this.logger.log(chalk.green(`📥 Downloading ${modpackFile.filename}...`));
            await downloader(modpackFile.url, modpackPath);
            this.logger.log(chalk.green(`✅ Modpack downloaded to ${modpackPath}`));
        } catch (err) {
            await logPopupError('Modrinth Error', chalk.red(`❌ Failed to download modpack: ${err}`), true);
            return;
        }

        try {
            this.logger.log('Extracting modpack...');
            await extractZip(modpackPath, modpackFolder); 
            fs.unlinkSync(modpackPath);

            let data_files = path.join(modpackFolder, 'data');

            if (fs.existsSync(path.join(modpackFolder, 'overrides'))) {
                this.logger.log('Moving configs...');
                await moveFolderContents(path.join(modpackFolder, 'overrides'), data_files);

                cleanDir(path.join(modpackFolder, 'overrides'));
            }

            const modrinth_index = path.join(modpackFolder, 'modrinth.index.json');
            if (!fs.existsSync(modrinth_index)) fs.writeFileSync(modrinth_index, '{}');
            const modrinth_data: ModrinthModpackIndex = jsonParser(fs.readFileSync(modrinth_index, { encoding: 'utf-8' }));

            if(!modrinth_data.dependencies || !modrinth_data.formatVersion || !Array.isArray(modrinth_data.files)) {
                await logPopupError('Internal Error', '❌ Modrinth Index cannot be read by the launcher.', true);
                return;
            }

            const modrinth_files = modrinth_data.files.filter(v => v.downloads.length >= 1);

            const required_version_key = Object.keys(modrinth_data.dependencies).find(v => v === loader_provider.metadata.name.toLowerCase() || v.startsWith(loader_provider.metadata.name.toLowerCase()) || v.includes(loader_provider.metadata.name.toLowerCase()));
            const required_version = required_version_key ? modrinth_data.dependencies[required_version_key] || void 0 : void 0;

            function findMatchingProfile(profiles: LauncherProfile[], loaderName: string, version: string, requiredVersion?: string): LauncherProfile | undefined {
                return profiles.find(profile =>
                    profile?.origami?.metadata?.name === loaderName &&
                    profile?.lastVersionId === version &&
                    (requiredVersion ? (
                        profile.origami.path.includes(requiredVersion) ||
                        profile.name.includes(requiredVersion)
                    ) : true)
                );
            }

            let profiles = launcher_profiles
                .listProfiles()
                .map(id => launcher_profiles.getProfile(id))
                .filter(v => typeof v !== 'undefined');

            let profile = findMatchingProfile(profiles, loader_provider.metadata.name, version, required_version);

            if (!profile) {
                await new Promise(res => setTimeout(res, 700));

                this.logger.log('Downloading modloader...');
                await loader_provider.get(version, required_version);

                profiles = launcher_profiles
                    .listProfiles()
                    .map(id => launcher_profiles.getProfile(id))
                    .filter(v => typeof v !== 'undefined');

                profile = findMatchingProfile(profiles, loader_provider.metadata.name, version, required_version);
            }

            if(!profile) {
                await logPopupError('Internal Error', '❌ Cannot seem to get the proper modloader for this modpack.', true);
                return;
            }

            let profile_path = path.join(minecraft_dir(), 'versions', profile.origami.path);
            let jar = path.join(profile_path, `${profile.origami.path}.jar`);
            let json = path.join(profile_path, `${profile.origami.path}.json`);

            let modpack_jar = path.join(modpackFolder, `${profileId}.jar`);
            let modpack_json = path.join(modpackFolder, `${profileId}.json`);

            this.logger.log('Downloading mods...');

            await new Promise(res => setTimeout(res, 700));

            let options = new LauncherOptionsManager().getFixedOptions();
            let limit = pLimit(options.connections);

            const https_agent = new Agent({
                keepAlive: false,
                timeout: 50000,
                maxSockets: options.max_sockets,
            });

            let modrinth_emitter = new EventEmitter();

            modrinth_emitter.on('debug', (e) => this.logger.log(chalk.grey(String(e)).trim()));

            modrinth_emitter.on('download-status', (data) => {
                let { name, current, total } = data;
                
                if(!progress.has(name)) {
                    progress.create(name, total, true);
                    progress.start();
                }

                progress.updateTo(name, current);
            });

            modrinth_emitter.on('download', (name) => {
                if(progress.has(name)) {
                    progress.stop(name);
                }
            });

            progress.create(data.hit.title, modrinth_files.length, true);
            progress.start();
            
            await limitedAll(modrinth_files.map(async(mod) => {
                let directory = path.join(data_files, path.dirname(mod.path));
                ensureDir(directory);

                let file_path = path.join(data_files, mod.path);
                let url = mod.downloads[0];

                await downloadAsync(url, file_path, true, 'mod', 10, https_agent, modrinth_emitter);
                progress.update(data.hit.title);
            }), limit);

            
            this.logger.log('Fetching minecraft jar files...');
            if (await pathExists(json)) await writeFile(modpack_json, (await readFile(json)));
            if (await pathExists(jar)) await writeFile(modpack_jar, (await readFile(jar)));

            this.logger.log('Adding Profiles...');
            launcher_profiles.addProfile(profileId, version, profileId, loader_provider.metadata);

            this.logger.success(`🌸 Successfully installed the modpack ${chalk.bold.yellow(profileId)}`);
            return;
        } catch (err) {
            await logPopupError('Modrinth Error', chalk.red(`❌ Failed to install modpack: ${err}`), true);
            return;
        }
    }
}