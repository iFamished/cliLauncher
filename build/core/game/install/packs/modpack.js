"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModpackInstaller = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const modrinth_1 = require("./modrinth");
const logger_1 = require("../../../tools/logger");
const common_1 = require("../../../utils/common");
const download_1 = require("../../../utils/download");
const modrinth_2 = require("../../../../types/modrinth");
const ora_1 = __importDefault(require("ora"));
const launcher_1 = __importDefault(require("../../../tools/launcher"));
const fs_extra_1 = require("fs-extra");
const data_manager_1 = require("../../../tools/data_manager");
const minecraft_versions_1 = require("../../../utils/minecraft_versions");
const registry_1 = require("../registry");
const promises_1 = require("fs/promises");
const options_1 = __importDefault(require("../../launch/options"));
const p_limit_1 = __importDefault(require("p-limit"));
const handler_1 = require("../../launch/handler");
const events_1 = __importDefault(require("events"));
const https_1 = require("https");
class ModpackInstaller {
    logger;
    modrinth;
    pageSize = 10;
    constructor(logger) {
        this.logger = logger;
        this.modrinth = new modrinth_1.ModrinthProjects(logger);
    }
    async configure_filters(project_type) {
        const stored = (0, data_manager_1.get)('search:filters') ?? { selectedCategories: ['loader:fabric'] };
        const storedPageLimit = (0, data_manager_1.get)('search:page_limit') ?? 20;
        const currentSort = stored.sort ?? 'relevance';
        const currentCategories = stored.selectedCategories ?? [];
        const currentLoader = currentCategories.find(v => v.startsWith('loader:'))?.split(':')[1];
        const selectedCategories = currentCategories.filter(v => !v.startsWith('loader:'));
        const rawCategories = await this.modrinth.tags.getCategories(project_type) ?? [];
        const loaderOptions = new registry_1.InstallerRegistry()
            .list()
            .filter(v => v !== 'vanilla')
            .map(v => ({ name: v, value: v }));
        const categoryOptions = rawCategories.map(v => ({ name: v.name, value: v.name }));
        const { configureWhat } = await inquirer_1.default.prompt([
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
            const { sort: newSort } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'sort',
                    message: '📊 Sort results by:',
                    choices: modrinth_2.ModrinthSortOptions.map(opt => ({
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
            const { categories: newCategories } = await inquirer_1.default.prompt([
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
            const { loader: selectedLoader } = await inquirer_1.default.prompt([
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
            const { page_limit: newPageLimit } = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'page_limit',
                    message: '📄 How many results per page?',
                    default: page_limit,
                    filter: input => parseInt(input, 10),
                    validate: input => {
                        const num = parseInt(input, 10);
                        if (isNaN(num) || num <= 0)
                            return 'Page limit must be a positive number';
                        if (num > 100)
                            return 'Maximum allowed is 100';
                        return true;
                    }
                }
            ]);
            page_limit = newPageLimit;
            (0, data_manager_1.set)('search:page_limit', page_limit);
        }
        const finalCategories = categories.concat(loader ? [`loader:${loader}`] : []);
        (0, data_manager_1.set)('search:filters', {
            sort,
            selectedCategories: finalCategories,
        });
        return { sort, categories, loader, page_limit };
    }
    async ask_confirmation(message, _applyToAll = false, _default = undefined) {
        const { choice } = _default ? { choice: _default } : await inquirer_1.default.prompt([
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
        const { applyToAll } = _applyToAll ? { applyToAll: _applyToAll } : await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'applyToAll',
                message: 'Apply this choice to all remaining items?',
                default: false
            }
        ]);
        return { choice, applyToAll };
    }
    async install_modrinth_content() {
        const manager = new launcher_1.default();
        const type = 'modpack';
        let page = parseInt(String((0, data_manager_1.get)('search:page') || '0'));
        let mode = 'home';
        let query = '';
        while (true) {
            let defaults_p = (0, data_manager_1.get)('search:filters');
            let sort_p = defaults_p?.sort ?? 'relevance';
            let categories_p = defaults_p?.selectedCategories || ['loader:fabric'];
            console.clear();
            console.log(chalk_1.default.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (Page ${page + 1})\n`));
            const spinner = (0, ora_1.default)('🐾 Warming up the search engine...').start();
            this.pageSize = parseInt(String((0, data_manager_1.get)('search:page_limit') || '10'));
            let searchResults;
            const categories = categories_p ? categories_p.filter(v => !v.startsWith('loader:')) : undefined;
            const loaders = categories_p ? categories_p.filter(v => v.startsWith('loader:')).map(v => v.split(':')[1]) : undefined;
            const commonQuery = {
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
            const choices = [];
            choices.push({ name: '[🔍 Search]', value: '__search' });
            choices.push({ name: '[🛠️  Configure Filters]', value: '__configure_filters' });
            let versions_data = [];
            spinner.text = `🎀 Gathering ${type} files...`;
            spinner.color = 'yellow';
            for (const hit of hits) {
                let versions = await this.modrinth.versions.fetchVersions(hit.project_id, loaders, void 0);
                let isInstalled = versions?.find(ver => manager.getProfile((0, common_1.sanitizePathSegment)(`${hit.title} - ${ver.name}`))) ? true : false;
                let supports_loader = versions?.some(v => v.loaders.length === 1 &&
                    v.loaders.some(loader => loaders?.includes(loader)));
                if (!supports_loader)
                    return;
                versions = versions?.filter(v => v.loaders.length === 1 &&
                    v.loaders.some(loader => loaders?.includes(loader))) || null;
                if (versions) {
                    versions_data.push({ hit, is_installed: isInstalled, versions });
                }
                else {
                    versions_data.push({ hit, is_installed: false, versions: [] });
                }
                const displayName = isInstalled
                    ? chalk_1.default.italic.underline(`${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()} — ${hit.description}`)
                    : `${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()} — ${hit.description}`;
                choices.push({ name: displayName, value: hit.project_id });
            }
            if (page > 0)
                choices.push({ name: '⬅ Previous page', value: '__prev' });
            if ((page + 1) * this.pageSize < total)
                choices.push({ name: '➡ Next page', value: '__next' });
            choices.push({ name: '🔙 Back', value: '__back' });
            spinner.succeed('Done');
            const { selected } = await inquirer_1.default.prompt({
                type: 'list',
                name: 'selected',
                message: 'Select an option:',
                choices,
                loop: false,
            });
            if (selected === '__back')
                break;
            if (selected === '__next') {
                page++;
                (0, data_manager_1.set)('search:page', page);
                continue;
            }
            if (selected === '__prev') {
                page--;
                (0, data_manager_1.set)('search:page', page);
                continue;
            }
            if (selected === '__search') {
                mode = 'search';
                const resp = await inquirer_1.default.prompt({
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
            if (!version_data) {
                await (0, logger_1.logPopupError)('Modrinth Error', '❌ No compatible versions found.');
                return;
            }
            ;
            console.clear();
            console.log(chalk_1.default.bold('🔄 Fetching versions...'));
            const versions = version_data.versions;
            if (!versions.length) {
                await (0, logger_1.logPopupError)('Modrinth Error', chalk_1.default.red('❌ No compatible versions found.'), true);
                return;
            }
            const versionChoices = versions.map(v => ({
                name: `${v.name} (${v.version_number})`,
                value: v
            }));
            const { selectedVersion } = await inquirer_1.default.prompt({
                type: 'list',
                name: 'selectedVersion',
                message: 'Select version to install:',
                choices: versionChoices,
                loop: false,
            });
            const file = selectedVersion.files.filter((f) => f.filename.endsWith('.mrpack')).find((f) => f.primary) || selectedVersion.files[0];
            if (!file) {
                await (0, logger_1.logPopupError)('Modrinth Error', chalk_1.default.red('❌ No downloadable file found.'), true);
                return;
            }
            await this.handleModpackInstall(selectedVersion, version_data, loaders?.length ? loaders[0] : 'fabric');
            break;
        }
    }
    async handleModpackInstall(selected, data, loader) {
        const modpackFile = selected.files.find(f => f.primary) || selected.files[0];
        const loader_provider = new registry_1.InstallerRegistry().get(loader);
        const launcher_profiles = new launcher_1.default();
        if (!modpackFile || !loader_provider) {
            await (0, logger_1.logPopupError)('Modrinth Error', chalk_1.default.red('❌ No valid modpack file found or invalid loader.'), true);
            return;
        }
        const version = selected.game_versions[0] || (await (0, minecraft_versions_1.fetchMinecraftVersionManifest)()).latest.release;
        const profileId = (0, common_1.sanitizePathSegment)(`${data.hit.title} - ${selected.name}`);
        const modpackFolder = path_1.default.join((0, common_1.minecraft_dir)(), 'versions', profileId);
        const modpackPath = path_1.default.join(modpackFolder, modpackFile.filename);
        if (data?.is_installed && fs_1.default.existsSync(modpackFolder) && fs_1.default.statSync(modpackFolder).isDirectory()) {
            await (0, logger_1.logPopupError)('Modpack Error', `🌸 Oopsie~! It looks like the modpack **"${modpackFile.filename}"** is already tucked safely in your files!\n\n` +
                `✨ If you want to reinstall it, you'll need to delete the old version manually!`, true);
            return;
        }
        if (fs_1.default.existsSync(modpackFolder))
            fs_1.default.rmSync(modpackFolder, { recursive: true, force: true });
        (0, fs_extra_1.emptyDirSync)(modpackFolder);
        try {
            this.logger.log(chalk_1.default.green(`📥 Downloading ${modpackFile.filename}...`));
            await (0, download_1.downloader)(modpackFile.url, modpackPath);
            this.logger.log(chalk_1.default.green(`✅ Modpack downloaded to ${modpackPath}`));
        }
        catch (err) {
            await (0, logger_1.logPopupError)('Modrinth Error', chalk_1.default.red(`❌ Failed to download modpack: ${err}`), true);
            return;
        }
        try {
            this.logger.log('Extracting modpack...');
            await (0, common_1.extractZip)(modpackPath, modpackFolder);
            fs_1.default.unlinkSync(modpackPath);
            let data_files = path_1.default.join(modpackFolder, 'data');
            if (fs_1.default.existsSync(path_1.default.join(modpackFolder, 'overrides'))) {
                this.logger.log('Moving configs...');
                await (0, common_1.moveFolderContents)(path_1.default.join(modpackFolder, 'overrides'), data_files);
                (0, common_1.cleanDir)(path_1.default.join(modpackFolder, 'overrides'));
            }
            const modrinth_index = path_1.default.join(modpackFolder, 'modrinth.index.json');
            if (!fs_1.default.existsSync(modrinth_index))
                fs_1.default.writeFileSync(modrinth_index, '{}');
            const modrinth_data = (0, common_1.jsonParser)(fs_1.default.readFileSync(modrinth_index, { encoding: 'utf-8' }));
            if (!modrinth_data.dependencies || !modrinth_data.formatVersion || !Array.isArray(modrinth_data.files)) {
                await (0, logger_1.logPopupError)('Internal Error', '❌ Modrinth Index cannot be read by the launcher.', true);
                return;
            }
            const modrinth_files = modrinth_data.files.filter(v => v.downloads.length >= 1);
            const required_version_key = Object.keys(modrinth_data.dependencies).find(v => v === loader_provider.metadata.name.toLowerCase() || v.startsWith(loader_provider.metadata.name.toLowerCase()) || v.includes(loader_provider.metadata.name.toLowerCase()));
            const required_version = required_version_key ? modrinth_data.dependencies[required_version_key] || void 0 : void 0;
            function findMatchingProfile(profiles, loaderName, version, requiredVersion) {
                return profiles.find(profile => profile?.origami?.metadata?.name === loaderName &&
                    profile?.lastVersionId === version &&
                    (requiredVersion ? (profile.origami.path.includes(requiredVersion) ||
                        profile.name.includes(requiredVersion)) : true));
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
            if (!profile) {
                await (0, logger_1.logPopupError)('Internal Error', '❌ Cannot seem to get the proper modloader for this modpack.', true);
                return;
            }
            let profile_path = path_1.default.join((0, common_1.minecraft_dir)(), 'versions', profile.origami.path);
            let jar = path_1.default.join(profile_path, `${profile.origami.path}.jar`);
            let json = path_1.default.join(profile_path, `${profile.origami.path}.json`);
            let modpack_jar = path_1.default.join(modpackFolder, `${profileId}.jar`);
            let modpack_json = path_1.default.join(modpackFolder, `${profileId}.json`);
            this.logger.log('Downloading mods...');
            await new Promise(res => setTimeout(res, 700));
            let options = new options_1.default().getFixedOptions();
            let limit = (0, p_limit_1.default)(options.connections);
            const https_agent = new https_1.Agent({
                keepAlive: false,
                timeout: 50000,
                maxSockets: options.max_sockets,
            });
            let modrinth_emitter = new events_1.default();
            modrinth_emitter.on('debug', (e) => this.logger.log(chalk_1.default.grey(String(e)).trim()));
            modrinth_emitter.on('download-status', (data) => {
                let { name, current, total } = data;
                if (!handler_1.progress.has(name)) {
                    handler_1.progress.create(name, total, true);
                    handler_1.progress.start();
                }
                handler_1.progress.updateTo(name, current);
            });
            modrinth_emitter.on('download', (name) => {
                if (handler_1.progress.has(name)) {
                    handler_1.progress.stop(name);
                }
            });
            handler_1.progress.create(data.hit.title, modrinth_files.length, true);
            handler_1.progress.start();
            await (0, common_1.limitedAll)(modrinth_files.map(async (mod) => {
                let directory = path_1.default.join(data_files, path_1.default.dirname(mod.path));
                (0, common_1.ensureDir)(directory);
                let file_path = path_1.default.join(data_files, mod.path);
                let url = mod.downloads[0];
                await (0, download_1.downloadAsync)(url, file_path, true, 'mod', 10, https_agent, modrinth_emitter);
                handler_1.progress.update(data.hit.title);
            }), limit);
            this.logger.log('Fetching minecraft jar files...');
            if (await (0, fs_extra_1.pathExists)(json))
                await (0, promises_1.writeFile)(modpack_json, (await (0, promises_1.readFile)(json)));
            if (await (0, fs_extra_1.pathExists)(jar))
                await (0, promises_1.writeFile)(modpack_jar, (await (0, promises_1.readFile)(jar)));
            this.logger.log('Adding Profiles...');
            launcher_profiles.addProfile(profileId, version, profileId, loader_provider.metadata);
            this.logger.success(`🌸 Successfully installed the modpack ${chalk_1.default.bold.yellow(profileId)}`);
            return;
        }
        catch (err) {
            await (0, logger_1.logPopupError)('Modrinth Error', chalk_1.default.red(`❌ Failed to install modpack: ${err}`), true);
            return;
        }
    }
}
exports.ModpackInstaller = ModpackInstaller;
//# sourceMappingURL=modpack.js.map