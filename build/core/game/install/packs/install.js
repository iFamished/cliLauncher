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
class ModInstaller {
    logger;
    modrinth;
    pageSize = 10;
    constructor(logger) {
        this.logger = logger;
        this.modrinth = new modrinth_1.ModrinthProjects(logger);
    }
    async install_modrinth_content(profile) {
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
        let page = 0;
        let mode = 'home';
        let query = '';
        const mcVersion = profile.lastVersionId;
        const loader = profile.origami.metadata.name.toLowerCase();
        const version_folder = path_1.default.join((0, common_1.minecraft_dir)(true), 'instances', profile.origami.path);
        const folder = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks' }[type] || 'mods';
        const dest = path_1.default.join(version_folder, folder);
        (0, common_1.ensureDir)(dest);
        const installedFiles = new Set(fs_1.default.readdirSync(dest));
        while (true) {
            console.clear();
            console.log(chalk_1.default.bold(`📦 ${mode === 'home' ? 'Featured' : 'Search'} ${type}s (MC ${mcVersion}) — Page ${page + 1}\n`));
            let searchResults;
            const commonQuery = {
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
            const choices = [];
            choices.push({ name: '[🔍 Search]', value: '__search' });
            for (const hit of hits) {
                const isInstalled = installedFiles.has(`${hit.project_id}-${hit.title}-${hit.slug}.jar`);
                const displayName = isInstalled
                    ? chalk_1.default.italic(`${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`)
                    : `${hit.title} — ⬇ ${hit.downloads.toLocaleString()} / ⭐ ${hit.follows.toLocaleString()}`;
                choices.push({ name: displayName, value: hit.project_id });
            }
            if (page > 0)
                choices.push({ name: '⬅ Previous page', value: '__prev' });
            if ((page + 1) * this.pageSize < total)
                choices.push({ name: '➡ Next page', value: '__next' });
            choices.push({ name: '🔙 Back', value: '__back' });
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
                continue;
            }
            if (selected === '__prev') {
                page--;
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
            let data = hits.find(v => v.project_id === selected) || hits[0];
            await this.handleProjectInstall(selected, type, mcVersion, profile, dest, data);
            break;
        }
    }
    async handleProjectInstall(projectId, type, mcVersion, profile, dest, data) {
        console.clear();
        console.log(chalk_1.default.bold('🔄 Fetching versions...'));
        const versions = await this.modrinth.versions.fetchVersions(projectId, type === 'mod' ? [profile.origami.metadata.name.toLowerCase()] : undefined, type === 'mod' ? [mcVersion] : undefined, type === 'mod' ? true : undefined);
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
        const filename = type === 'mod' ? `${data.project_id}-${data.title}-${data.slug}.jar` : file.filename;
        const outPath = path_1.default.join(dest, filename);
        const filesInFolder = fs_1.default.readdirSync(dest);
        if (filesInFolder.find(v => v === filename)) {
            const fullPath = path_1.default.join(dest, filename);
            fs_1.default.unlinkSync(fullPath);
            this.logger.log(chalk_1.default.yellow(`🗑 Removed old version: ${filename}`));
        }
        this.logger.log(chalk_1.default.green(`📥 Downloading ${filename}...`));
        await (0, download_1.downloader)(file.url, outPath);
        this.logger.log(chalk_1.default.green(`✅ Installed ${filename} to ${type}s folder.`));
        for (const dep of selectedVersion.dependencies) {
            if (dep.dependency_type !== 'required')
                continue;
            const depProject = await this.modrinth.getProject(dep.project_id);
            if (!depProject) {
                this.logger.log(chalk_1.default.yellow(`⚠️  Skipped missing dependency: ${dep.project_id}`));
                continue;
            }
            this.logger.log(chalk_1.default.blue(`📦 Installing dependency: ${depProject.title}`));
            const depVersions = await this.modrinth.versions.fetchVersions(dep.project_id, [profile.origami.metadata.name.toLowerCase()], [mcVersion], true);
            if (!depVersions?.length) {
                this.logger.log(chalk_1.default.red(`❌ No compatible version found for dependency: ${depProject.title}`));
                continue;
            }
            const depFile = depVersions[0].files.find(f => f.primary) || depVersions[0].files[0];
            if (!depFile) {
                this.logger.log(chalk_1.default.red(`❌ No file found for dependency: ${depProject.title}`));
                continue;
            }
            const depFilename = `${depProject.id}-${depProject.title}-${depProject.slug}.jar`;
            const depPath = path_1.default.join(dest, depFilename);
            if (fs_1.default.existsSync(depPath))
                fs_1.default.unlinkSync(depPath);
            this.logger.log(chalk_1.default.green(`📥 Downloading dependency ${depFile.filename}...`));
            await (0, download_1.downloader)(depFile.url, depPath);
            this.logger.log(chalk_1.default.green(`✅ Installed dependency: ${depFile.filename}`));
        }
    }
}
exports.ModInstaller = ModInstaller;
//# sourceMappingURL=install.js.map