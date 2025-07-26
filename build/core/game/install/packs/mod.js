"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModInstaller = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const modrinth_1 = require("./modrinth");
const common_1 = require("../../../utils/common");
const download_1 = require("../../../utils/download");
const modrinth_2 = require("../../../../types/modrinth");
const manager_1 = __importDefault(require("./manager"));
const ora_1 = __importDefault(require("ora"));
class ModInstaller {
    logger;
    modrinth;
    pageSize = 10;
    constructor(logger) {
        this.logger = logger;
        this.modrinth = new modrinth_1.ModrinthProjects(logger);
    }
    async configure_filters(project_type, version, loader, manager, defaults) {
        const stored = manager.getDefaultFilters(project_type) ?? {};
        const currentSort = defaults?.sort ?? stored.sort ?? 'relevance';
        const currentVersionMatch = defaults?.versionMatch ?? ((stored.versionFilter?.length || 0) < 1 ? 'none' : stored.versionFilter?.length === 1 ? 'strict' : 'match') ?? 'strict';
        const currentCategories = defaults?.selectedCategories ?? stored.selectedCategories ?? [];
        const all_categories = (await this.modrinth.tags.getCategories(project_type)) || [];
        const categoryOptions = all_categories
            .filter(cat => project_type === 'mod' ? cat.name.toLowerCase() !== loader.toLowerCase() : true)
            .map(cat => ({ name: cat.name, value: cat.name }));
        const { configureWhat } = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'configureWhat',
                message: '🛠️ What would you like to configure?',
                choices: [
                    { name: `Sort (${currentSort})`, value: 'sort' },
                    { name: `Version match (${currentVersionMatch})`, value: 'versionMatch' },
                    { name: `Categories (${currentCategories.join(', ') || 'none'})`, value: 'categories' },
                    { name: `Page Limit (${manager.getPageLimit()})`, value: 'page_limit' },
                ]
            }
        ]);
        let sort = currentSort;
        let versionMatch = currentVersionMatch;
        let versionFilter = undefined;
        let categories = currentCategories;
        if (configureWhat.includes('sort')) {
            const sortAns = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'sort',
                    message: '📊 Sort results by:',
                    choices: modrinth_2.ModrinthSortOptions.map(opt => ({
                        name: opt.charAt(0).toUpperCase() + opt.slice(1),
                        value: opt,
                    })),
                    default: sort,
                }
            ]);
            sort = sortAns.sort;
        }
        if (configureWhat.includes('versionMatch')) {
            const versionAns = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'versionMatch',
                    message: '🎯 Minecraft version match strategy:',
                    choices: [
                        { name: 'Strict (exact version match)', value: 'strict' },
                        { name: 'Match (minor version match)', value: 'match' },
                        { name: 'None (ignore version)', value: 'none' }
                    ],
                    default: versionMatch
                }
            ]);
            versionMatch = versionAns.versionMatch;
            if (versionMatch === 'strict') {
                versionFilter = [version];
            }
            else if (versionMatch === 'match') {
                const matchedVersion = await this.modrinth.fetchAllMatchVersions(version);
                versionFilter = [version, ...matchedVersion.filter(ver => ver !== version)];
            }
            else {
                versionFilter = undefined;
            }
        }
        if (configureWhat.includes('categories')) {
            if (categoryOptions.length > 0) {
                const catAns = await inquirer_1.default.prompt([
                    {
                        type: 'checkbox',
                        name: 'selectedCategories',
                        message: '🧩 Select categories to filter by:',
                        choices: categoryOptions,
                        default: currentCategories,
                    }
                ]);
                categories = catAns.selectedCategories.length > 0 ? catAns.selectedCategories : undefined;
            }
        }
        if (project_type === 'mod' && !categories?.some(v => v.toLowerCase() === loader.toLowerCase())) {
            categories = [...(categories ?? []), loader.toLowerCase()];
        }
        if (configureWhat.includes('page_limit')) {
            const pageAns = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'page_limit',
                    message: '📄 How many results per page?',
                    default: `${manager.getPageLimit()}`,
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
            manager.currentPageLimit(pageAns.page_limit);
        }
        manager.configureFilter(project_type, {
            sort,
            versionFilter,
            selectedCategories: categories
        });
        return { sort, versionFilter, categories };
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
    async install_modrinth_content(profile) {
        const manager = new manager_1.default(profile);
        const { type } = await inquirer_1.default.prompt({
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
        let mode = 'home';
        let query = '';
        const mcVersion = profile.lastVersionId;
        const loader = profile.origami.metadata.name.toLowerCase();
        let defaults_p = manager.getDefaultFilters(type);
        let sort_p = defaults_p?.sort ?? 'relevance';
        let versions_p = defaults_p?.versionFilter ?? (type === 'mod' ? [profile.lastVersionId] : undefined);
        let categories_p = defaults_p?.selectedCategories;
        const version_folder = await (0, common_1.async_minecraft_data_dir)(profile.origami.path);
        const folder = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' }[type] || 'mods';
        const dest = path_1.default.join(version_folder, folder);
        (0, common_1.ensureDir)(dest);
        while (true) {
            console.clear();
            console.log(chalk_1.default.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (MC ${mcVersion}) — Page ${page + 1})\n`));
            const spinner = (0, ora_1.default)('🐾 Warming up the search engine...').start();
            this.pageSize = manager.getPageLimit();
            let searchResults;
            const commonQuery = {
                query: mode === 'search' ? (query || '*') : '*',
                limit: this.pageSize,
                offset: page * this.pageSize,
                index: sort_p,
                facets: {
                    project_type: type,
                    versions: versions_p,
                    categories: categories_p,
                    loaders: type === 'mod' ? [loader] : undefined,
                }
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
                const raw_versions = await this.modrinth.versions.fetchVersions(hit.project_id, type === 'mod' ? [loader] : undefined, versions_p);
                const supports_loader = raw_versions?.some(v => v.loaders.includes(loader));
                if (!supports_loader && type === 'mod')
                    return;
                const versions = raw_versions?.filter(v => {
                    if (type !== 'mod')
                        return true;
                    return v.loaders.includes(loader);
                });
                let isInstalled = versions?.find(v => v.files.find(f => manager.getFromType(f.filename, type)));
                let file = isInstalled ? isInstalled.files.find(f => manager.getFromType(f.filename, type)) : undefined;
                if (versions) {
                    versions_data.push({ hit: hit.project_id, is_installed: isInstalled, specific: file, versions });
                }
                else {
                    versions_data.push({ hit: hit.project_id, is_installed: undefined, specific: undefined, versions: [] });
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
                manager.currentPage(page);
                continue;
            }
            if (selected === '__prev') {
                page--;
                manager.currentPage(page);
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
    async handleProjectInstall(versions_raw, type, profile, dest, data, manager) {
        console.clear();
        console.log(chalk_1.default.bold('🔄 Fetching versions...'));
        const versions = versions_raw;
        if (!versions?.length) {
            console.log(chalk_1.default.red('❌ No compatible versions found.'));
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
        const file = selectedVersion.files.find((f) => f.primary) || selectedVersion.files[0];
        if (!file) {
            console.log(chalk_1.default.red('❌ No downloadable file found.'));
            return;
        }
        let main_apply_to_all = false;
        let main_default = undefined;
        if (data?.is_installed && data?.specific && fs_1.default.existsSync(path_1.default.join(dest, data.specific.filename))) {
            const confirm = await this.ask_confirmation(`You've already installed mod version '${data.specific.filename}'. What do you want to do?`, main_apply_to_all, main_default);
            if (confirm.applyToAll) {
                main_apply_to_all = confirm.applyToAll;
                main_default = confirm.choice;
            }
            ;
            if (confirm.choice === 'replace') {
                const fullPath = path_1.default.join(dest, data.specific.filename);
                fs_1.default.unlinkSync(fullPath);
                this.logger.log(chalk_1.default.yellow(`🗑 Removed old version: ${data.specific.filename}`));
                manager.deleteFromType(data.specific.filename, type);
                await downloadMod(file, this.logger, type);
            }
            else if (confirm.choice === 'keep') {
                this.logger.log(chalk_1.default.gray(`⏭️ Skipped: ${data.specific.filename} (already installed)`));
            }
        }
        else
            await downloadMod(file, this.logger, type);
        async function downloadMod(file, logger, type) {
            const filename = file.filename;
            const outPath = path_1.default.join(dest, filename);
            if (fs_1.default.existsSync(outPath))
                fs_1.default.unlinkSync(outPath);
            logger.log(chalk_1.default.green(`📥 Downloading ${filename}...`));
            await (0, download_1.downloader)(file.url, outPath);
            logger.log(chalk_1.default.green(`✅ Installed ${filename} to ${type}s folder.`));
            manager.addFromType(filename, type);
        }
        ;
        let deps_apply_to_all = false;
        let deps_default = undefined;
        for (const dep of selectedVersion.dependencies) {
            if (dep.dependency_type !== 'required')
                continue;
            const depProject = await this.modrinth.getProject(dep.project_id);
            if (!depProject) {
                this.logger.log(chalk_1.default.yellow(`⚠️  Skipped missing dependency: ${dep.project_id}`));
                continue;
            }
            this.logger.log(chalk_1.default.blue(`📦 Installing dependency: ${depProject.title}`));
            const depVersions = await this.modrinth.versions.fetchVersions(dep.project_id, type === 'mod' ? [profile.origami.metadata.name.toLowerCase()] : undefined, selectedVersion.game_versions);
            if (!depVersions?.length) {
                this.logger.log(chalk_1.default.red(`❌ No compatible version found for dependency: ${depProject.title}`));
                continue;
            }
            const depFile = depVersions[0].files.find(f => f.primary) || depVersions[0].files[0];
            if (!depFile) {
                this.logger.log(chalk_1.default.red(`❌ No file found for dependency: ${depProject.title}`));
                continue;
            }
            const isInstalled = depVersions?.find(v => v.files.find(f => manager.getFromType(f.filename, type)));
            const file = isInstalled ? isInstalled.files.find(f => manager.getFromType(f.filename, type)) : undefined;
            if (isInstalled && file && fs_1.default.existsSync(path_1.default.join(dest, file.filename))) {
                const confirm = await this.ask_confirmation(`You've already installed mod version '${file.filename}'. What do you want to do?`, deps_apply_to_all, deps_default);
                if (confirm.applyToAll) {
                    deps_apply_to_all = confirm.applyToAll;
                    deps_default = confirm.choice;
                }
                ;
                if (confirm.choice === 'replace') {
                    const fullPath = path_1.default.join(dest, file.filename);
                    fs_1.default.unlinkSync(fullPath);
                    this.logger.log(chalk_1.default.yellow(`🗑 Removed old version: ${file.filename}`));
                    manager.deleteFromType(file.filename, type);
                    await downloadMod(depFile, this.logger, type);
                }
                else if (confirm.choice === 'keep') {
                    this.logger.log(chalk_1.default.gray(`⏭️ Skipped: ${file.filename} (already installed)`));
                }
            }
            else
                await downloadMod(depFile, this.logger, type);
        }
    }
}
exports.ModInstaller = ModInstaller;
//# sourceMappingURL=mod.js.map