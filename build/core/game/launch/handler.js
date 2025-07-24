"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = exports.progress = exports.logger = void 0;
const launcher_1 = __importDefault(require("../../tools/launcher"));
const common_1 = require("../../utils/common");
const account_1 = require("../account");
const account_2 = __importDefault(require("../account/account"));
const path_1 = __importDefault(require("path"));
const java_1 = __importDefault(require("../../../java"));
const string_argv_1 = __importDefault(require("string-argv"));
const options_1 = __importDefault(require("./options"));
const logger_1 = require("../../tools/logger");
const defaults_1 = require("../../../config/defaults");
const chalk_1 = __importDefault(require("chalk"));
const launcher_2 = __importDefault(require("../../launcher"));
const registry_1 = require("../install/registry");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = require("fs-extra");
const manager_1 = __importDefault(require("../install/packs/manager"));
const child_process_1 = require("child_process");
const minecraft_versions_1 = require("../../utils/minecraft_versions");
exports.logger = new logger_1.Logger();
exports.progress = exports.logger.progress();
class Handler {
    profiles = new launcher_1.default();
    accounts = new account_2.default();
    settings = new options_1.default();
    installers = new registry_1.InstallerRegistry();
    auth_provider = null;
    currentAccount = null;
    constructor() { }
    jsonParser(str) {
        try {
            return JSON.parse(str);
        }
        catch (_) {
            return {};
        }
    }
    launcherToUser(la) {
        return {
            access_token: la.access_token,
            client_token: la.client_token || defaults_1.ORIGAMI_CLIENT_TOKEN,
            uuid: la.uuid,
            name: la.name ?? "Origami-User",
            user_properties: typeof la.user_properties === "string"
                ? this.jsonParser(la.user_properties)
                : la.user_properties ?? {},
            meta: la.meta
                ? {
                    type: la.meta.type === "msa"
                        ? "msa"
                        : "mojang",
                    demo: la.meta.demo,
                }
                : undefined,
        };
    }
    getVersion(versionJson) {
        let version_data = this.jsonParser((0, fs_extra_1.readFileSync)(versionJson, { encoding: "utf-8" }));
        return {
            version: version_data["inheritsFrom"] || version_data["id"],
            type: version_data["type"] || "release",
        };
    }
    async get_auth() {
        this.currentAccount = await this.accounts.getSelectedAccount();
        if (!this.currentAccount) {
            await (0, logger_1.logPopupError)("Authentication Error", "⚠️  No account selected! Please log in first. 🐾", true);
            return null;
        }
        const auth = await (0, account_1.getAuthProvider)(this.currentAccount);
        if (!auth) {
            exports.logger.warn("❌ Failed to load the appropriate auth provider.");
            return null;
        }
        this.auth_provider = auth;
        const jvmArgs = await auth.auth_lib() ?? "";
        exports.logger.log("🔐 Authenticating... Please wait.");
        const token = await auth.token();
        if (!token) {
            await (0, logger_1.logPopupError)("Authentication Error", "🚫 Authentication token could not be retrieved.", true);
            return null;
        }
        return {
            jvm: jvmArgs,
            token,
        };
    }
    async login(credentials, auth_provider) {
        try {
            if (await this.accounts.hasAccount(credentials, auth_provider)) {
                exports.logger.warn("⚠️  An account with these credentials already exists! Skipping login. 🐾");
                return null;
            }
            const auth = await (0, account_1.getAuthProvider)(auth_provider);
            if (!auth) {
                exports.logger.error(`❌ Could not resolve the auth provider: '${auth_provider}'`);
                return null;
            }
            this.auth_provider = auth;
            auth.set_credentials(credentials.email, credentials.password);
            exports.logger.log("🔐 Authenticating... Please wait.");
            const token = await auth.authenticate();
            if (!token) {
                await (0, logger_1.logPopupError)("Authentication Error", "🚫 Authentication failed — invalid credentials or network error.", true);
                return null;
            }
            await this.accounts.addAccount(token);
            await this.accounts.selectAccount(token.id);
            this.currentAccount = token;
            exports.logger.log(`✅ Logged in as ${token.name} [${token.uuid}] via "${auth_provider}" 🎉`);
            return token;
        }
        catch (err) {
            await (0, logger_1.logPopupError)("Authentication Error", "💥 Unexpected error during login:" + err.message, true);
            return null;
        }
    }
    async choose_profile() {
        return this.profiles.chooseProfile();
    }
    async choose_account() {
        return this.accounts.chooseAccount();
    }
    getJava(java) {
        return new Promise(resolve => {
            (0, child_process_1.exec)(`"${java}" -version`, (error, stdout, stderr) => {
                if (error) {
                    resolve(null);
                }
                else {
                    let version_match = stderr.match(/"(.*?)"/);
                    resolve(version_match ? version_match.pop() || null : null);
                }
            });
        });
    }
    async run_minecraft(_name) {
        let mc_dir = (0, common_1.minecraft_dir)();
        let version_dir = path_1.default.join(mc_dir, 'versions');
        let cache_dir = path_1.default.join(mc_dir, '.cache');
        let selected_profile = this.profiles.getSelectedProfile();
        let name = selected_profile?.name || _name;
        if (!_name && (!selected_profile || !name) || !name) {
            await (0, logger_1.logPopupError)('Profile Error', chalk_1.default.bgHex('#f87171').hex('#fff')(' 💔 No profile selected! ') + chalk_1.default.hex('#fca5a5')('Please pick a profile before launching the game.'), true);
            return null;
        }
        if (selected_profile)
            this.settings.setProfile(selected_profile);
        else
            this.settings.setProfile();
        let version_path = path_1.default.join(version_dir, name);
        let version_json = path_1.default.join(version_path, `${name}.json`);
        let version_object = this.jsonParser((0, fs_extra_1.readFileSync)(version_json, { encoding: 'utf-8' }));
        if (!(0, fs_extra_1.existsSync)(version_path) || !(0, fs_extra_1.existsSync)(version_json)) {
            return null;
        }
        let origami_dir = (0, common_1.minecraft_dir)(true);
        let origami_data = path_1.default.join(origami_dir, 'instances', name);
        (0, common_1.ensureDir)(origami_data);
        try {
            let java = await java_1.default.select(false, selected_profile?.origami.version);
            let auth = await this.get_auth();
            if (!java || !auth)
                return null;
            return await new Promise(async (resolve) => {
                let libraryRoot = path_1.default.join(mc_dir, 'libraries');
                let assetRoot = path_1.default.join(mc_dir, 'assets');
                let version = this.getVersion(version_json);
                let loader = this.installers.get(this.installers.list().sort((a, b) => b.length - a.length).find(ld => name.toLowerCase().startsWith(ld) || name.toLowerCase().includes(ld)) || 'vanilla');
                let installed_java = await this.getJava(java.path);
                let java_check = await (0, minecraft_versions_1.isJavaCompatible)(installed_java, version.version);
                if (!java_check.result && java_check.required) {
                    if (java_check.installed === null || isNaN(java_check.installed)) {
                        await (0, logger_1.logPopupError)('Java Runtime Error', `🚫 Java isn't working or can't be found! 💔

                                    We tried running \`java -version\`, but... nothing came back. 😢
                                    That means Java might not be installed, or it's broken.

                                    ☕ Minecraft needs Java to run, It's like the heart of everything!

                                    ✨ You can install the right one by running:
                                        👉 \`origami java --install\`
                                        🌸 Or open the menu with: \`origami menu\`

                                    Once Java's ready, we'll hop right into your world~ 💖🐇`, true);
                    }
                    else {
                        await (0, logger_1.logPopupError)('Java Runtime Error', `🐾 Aww, your Java version doesn't match what we need! ⚠️

                                    This Minecraft version needs Java ${java_check.required}, 
                                    but your current Java is ${java_check.installed}. 😿

                                    It could be too old or even too new, either way, it's not compatible.

                                    ✨ You can fix it with:
                                        👉 \`origami java --install\`
                                        🌸 Or just run: \`origami menu\`

                                    Once we get the right Java, we'll be building together in no time~! 🧱🌼`, true);
                    }
                    return resolve(null);
                }
                let jvmArgs = `${auth.jvm}`;
                let additional_jvm = this.profiles.getJvm(selected_profile?.origami.version || '');
                if (additional_jvm !== '') {
                    exports.logger.log(`⚠️  Additional JVM Flags: ${additional_jvm}`);
                    jvmArgs = `${jvmArgs} ${additional_jvm}`;
                }
                if (loader && loader.metadata.unstable) {
                    exports.logger.warn(`⚠️  Heads up! ${loader.metadata.name} support is a bit wobbly right now — it might break or misbehave 🧪👀`);
                }
                const getOS = () => {
                    switch (process.platform) {
                        case 'win32': return 'windows';
                        case 'darwin': return 'osx';
                        default: return 'linux';
                    }
                };
                const parseLoaderJVM = (jvm, loader) => {
                    const separator = getOS() === 'windows' ? ';' : ':';
                    const neoforged = version_object.arguments?.jvm;
                    const neoforge_jvm = neoforged && Array.isArray(neoforged) ? neoforged.join(' ') : '';
                    if (loader.metadata.name.toLowerCase() === 'neoforge')
                        return jvm
                            .replaceAll('${neoforged}', neoforge_jvm)
                            .replaceAll('${classpath_separator}', separator)
                            .replaceAll('${version_name}', name)
                            .replaceAll('${library_directory}', libraryRoot);
                    return jvm;
                };
                if (loader && loader.metadata.jvm) {
                    jvmArgs = `${parseLoaderJVM(loader.metadata.jvm, loader)} ${jvmArgs}`;
                }
                let javaPath = java.path;
                if (selected_profile && selected_profile.origami.metadata.name.toLowerCase() !== 'vanilla') {
                    const mod_manager = new manager_1.default(selected_profile);
                    const installed = mod_manager.getList().mods;
                    if (installed.length === 0) {
                        exports.logger.log(chalk_1.default.yellow('✨ No mods installed for this profile.'));
                    }
                    else {
                        exports.logger.log(chalk_1.default.green.bold('\n📦 Installed:\n'));
                        installed.forEach((mod, index) => {
                            let isDisabled = mod_manager.isModDisabled(mod);
                            exports.logger.log(chalk_1.default.cyan(`  ${isDisabled ? `${chalk_1.default.gray('(disabled)')} ` : ''}${index + 1}. ${mod}`));
                        });
                    }
                }
                let auth_token = auth.token;
                let settings = this.settings.getFixedOptions();
                let memory = settings.memory;
                let window = settings.window_size;
                let metadata = {
                    name: 'Origami',
                    version: (0, common_1.printVersion)(),
                };
                let launcher = new launcher_2.default();
                let instance = {
                    authorization: this.launcherToUser(auth_token),
                    root: mc_dir,
                    customArgs: (0, string_argv_1.default)(jvmArgs),
                    version: {
                        number: version.version,
                        type: version.type,
                        custom: name,
                    },
                    memory, javaPath,
                    window: {
                        ...window,
                        fullscreen: settings.fullscreen,
                    },
                    cache: cache_dir,
                    overrides: {
                        libraryRoot, assetRoot,
                        gameDirectory: origami_data,
                        cwd: version_path,
                        detached: settings.safe_exit,
                        maxSockets: settings.max_sockets,
                        connections: settings.connections,
                        versionName: `${metadata.name}/${metadata.version}`
                    },
                    launcher: metadata
                };
                launcher.launch(instance).then((proc) => {
                    exports.logger.warn(`Minecraft PID: ${chalk_1.default.yellow(proc?.pid || "<cannot be fetched>")}`);
                });
                launcher.on("close", (code) => {
                    resolve(`${code || 1}`);
                });
                launcher.on('debug', (e) => exports.logger.log(chalk_1.default.grey(String(e)).trim()));
                launcher.on('minecraft-log', (e) => exports.logger.log(chalk_1.default.white(String(e)).trim()));
                launcher.on('minecraft-error', (e) => exports.logger.log(chalk_1.default.redBright(String(e)).trim()));
                launcher.on('progress', (data) => {
                    let { type, task, total } = data;
                    if (!exports.progress.has(type)) {
                        exports.progress.create(type, total);
                        exports.progress.start();
                    }
                    exports.progress.updateTo(type, task);
                });
                launcher.on('progress-end', (data) => {
                    if (exports.progress.has(data.type)) {
                        exports.progress.stop(data.type);
                    }
                });
                launcher.on('download-status', (data) => {
                    let { name, current, total } = data;
                    if (!exports.progress.has(name)) {
                        exports.progress.create(name, total, true);
                        exports.progress.start();
                    }
                    exports.progress.updateTo(name, current);
                });
                launcher.on('download', (name) => {
                    if (exports.progress.has(name)) {
                        exports.progress.stop(name);
                    }
                });
            });
        }
        catch (_) {
            return null;
        }
    }
    configure_settings() {
        return this.settings.configureOptions();
    }
    async install_version() {
        const installers = this.installers;
        const availableInstallers = installers.list()
            .map(id => installers.get(id))
            .filter((v) => v);
        if (availableInstallers.length === 0) {
            exports.logger.warn("⚠️ No available installers found.");
            return;
        }
        const minecraft_launcher_profiles = path_1.default.join((0, common_1.minecraft_dir)(), 'launcher_profiles.json');
        if (!(0, fs_extra_1.existsSync)(minecraft_launcher_profiles)) {
            (0, fs_extra_1.writeFileSync)(minecraft_launcher_profiles, JSON.stringify({ profiles: {} }));
        }
        const choices = availableInstallers.map(installer => ({
            name: (installer?.metadata.unstable ? chalk_1.default.redBright('[UNSTABLE] ') : '') +
                chalk_1.default.green(`[${installer?.metadata.author}] `) +
                chalk_1.default.hex("#c4b5fd")(installer?.metadata.name) +
                chalk_1.default.magenta(" - " + chalk_1.default.yellow(installer?.metadata.description)),
            value: installer
        }));
        const defaultInstaller = availableInstallers.find(v => v?.metadata.name.toLowerCase() === "vanilla");
        const { selected } = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "selected",
                message: chalk_1.default.hex("#f472b6")("🌷 Choose a version type to install:"),
                choices,
                default: defaultInstaller
            }
        ]);
        const selectedInstaller = selected;
        if (!selectedInstaller) {
            exports.logger.error(`❌ Installer "${selected}" not found.`);
            return;
        }
        exports.logger.log(`🔧 Installing via ${selectedInstaller.metadata.name}...`);
        const result = await selectedInstaller.get();
        if (result) {
            exports.logger.success(`🎉 Installed ${result.name} ${result.version} successfully!`);
        }
        else {
            exports.logger.error(`❌ Installation failed.`);
        }
    }
    async remove_account() {
        const accounts = await this.accounts.listAccounts();
        if (accounts.length === 0) {
            exports.logger.warn("⚠️ No accounts available to remove.");
            return;
        }
        const { selected } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'selected',
                message: chalk_1.default.hex('#f87171')('❌ Select an account to remove:'),
                choices: accounts.map(acc => ({
                    name: `${acc.name} (${acc.uuid})`,
                    value: acc.id
                }))
            }
        ]);
        const selectedAccount = accounts.find(acc => acc.id === selected);
        if (!selectedAccount) {
            exports.logger.error("❌ Selected account not found.");
            return;
        }
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk_1.default.red(`Are you sure you want to delete account "${selectedAccount.name}"?`),
                default: false
            }
        ]);
        if (!confirm) {
            exports.logger.log("🔙 Account removal cancelled.");
            return;
        }
        const removed = await this.accounts.deleteAccount(selected);
        if (removed) {
            exports.logger.success(`🗑️ Removed account "${selectedAccount.name}" successfully!`);
            const selected = await this.accounts.getSelectedAccount();
            if (!selected) {
                this.currentAccount = null;
                exports.logger.warn("⚠️ No account is now selected.");
            }
            else {
                this.currentAccount = selected;
            }
        }
        else {
            exports.logger.error("❌ Failed to remove the account.");
        }
    }
    async delete_profile() {
        const profiles = this.profiles.listProfiles().map(id => this.profiles.getProfile(id)).filter(v => typeof v !== 'undefined');
        if (profiles.length === 0) {
            exports.logger.warn("⚠️ No profiles to delete.");
            return;
        }
        const { selected } = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "selected",
                message: chalk_1.default.hex("#f87171")("🗑️ Select a profile/instance to delete:"),
                choices: profiles.map(p => ({
                    name: `${p.name} (${p.origami.version || "unknown"})`,
                    value: p
                }))
            }
        ]);
        const profile = selected;
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "confirm",
                message: chalk_1.default.red(`Are you sure you want to delete the "${profile.name}" profile and all associated data?`),
                default: false
            }
        ]);
        if (!confirm) {
            exports.logger.log("❌ Deletion cancelled.");
            return;
        }
        try {
            const mc_dir = (0, common_1.minecraft_dir)();
            const origami_dir = (0, common_1.minecraft_dir)(true);
            const version_path = path_1.default.join(mc_dir, "versions", profile.origami.path);
            const instance_path = path_1.default.join(origami_dir, "instances", profile.origami.path);
            if ((0, fs_extra_1.existsSync)(version_path))
                await (0, fs_extra_1.remove)(version_path);
            if ((0, fs_extra_1.existsSync)(instance_path))
                await (0, fs_extra_1.remove)(instance_path);
            this.profiles.deleteProfile(profile.origami.version);
            exports.logger.success(`🗑️ Successfully deleted profile "${profile.name}" and its data.`);
        }
        catch (err) {
            exports.logger.error(`💥 Failed to delete profile "${profile.name}":`, err.message);
        }
    }
}
exports.Handler = Handler;
//# sourceMappingURL=handler.js.map