import { Credentials, IAuthProvider } from "../../../types/account";
import { LauncherAccount, LauncherProfile } from "../../../types/launcher";
import LauncherProfileManager from "../../tools/launcher";
import { async_minecraft_data_dir, ensureDir, minecraft_dir, printVersion } from "../../utils/common";
import { getAuthProvider } from "../account";
import LauncherAccountManager from "../account/account";
import path from "path";
import temurin from "../../../java";
import parseArgsStringToArgv from "string-argv";
import LauncherOptionsManager from "./options";
import { Logger, logPopupError } from "../../tools/logger";
import { ORIGAMI_CLIENT_TOKEN } from "../../../config/defaults";
import chalk from "chalk";
import MCLCore from "../../launcher";
import { ILauncherOptions, IUser } from "../../launcher/types";
import { InstallerProvider, InstallerRegistry } from "../install/registry";
import inquirer from "inquirer";
import { existsSync, writeFileSync, readFileSync, remove } from "fs-extra";
import ModrinthModManager from "../install/packs/manager";
import { exec } from "child_process";
import { isJavaCompatible } from "../../utils/minecraft_versions";

export const logger = new Logger();
export const progress = logger.progress();

export class Handler {
    public profiles: LauncherProfileManager = new LauncherProfileManager();
    public accounts: LauncherAccountManager = new LauncherAccountManager();
    public settings: LauncherOptionsManager = new LauncherOptionsManager();
    public installers: InstallerRegistry = new InstallerRegistry();

    private auth_provider: IAuthProvider | null = null;

    private currentAccount: LauncherAccount | null = null;

    constructor() {}

    private jsonParser(str: string) {
        try {
            return JSON.parse(str);
        } catch(_) {
            return {};
        }
    }

    private launcherToUser(la: LauncherAccount): IUser {
        return {
            access_token: la.access_token,
            client_token: la.client_token || ORIGAMI_CLIENT_TOKEN,
            uuid: la.uuid,
            name: la.name ?? "Origami-User",
            user_properties:
            typeof la.user_properties === "string"
                ? this.jsonParser(la.user_properties)
                : la.user_properties ?? {},

            meta: la.meta
            ? {
                type:
                    la.meta.type === "msa"
                    ? "msa"
                    : "mojang",
                demo: la.meta.demo,
                }
            : undefined,
        };
    }

    private getVersion(versionJson: string) {
        let version_data = this.jsonParser(readFileSync(versionJson, { encoding: "utf-8" }));

        return {
            version: version_data["inheritsFrom"] || version_data["id"],
            type: version_data["type"] || "release",
        };
    }

    public async get_auth(): Promise<{ jvm: string; token: LauncherAccount } | null> {
        this.currentAccount = await this.accounts.getSelectedAccount();

        if (!this.currentAccount) {
            await logPopupError("Authentication Error", "⚠️  No account selected! Please log in first. 🐾", true);
            return null;
        }

        const auth = await getAuthProvider(this.currentAccount);
        if (!auth) {
            logger.warn("❌ Failed to load the appropriate auth provider.");
            return null;
        }

        this.auth_provider = auth;

        const jvmArgs = await auth.auth_lib() ?? "";

        logger.log("🔐 Authenticating... Please wait.");
        const token = await auth.token();
        
        if (!token) {
            await logPopupError("Authentication Error", "🚫 Authentication token could not be retrieved.", true);
            return null;
        }

        return {
            jvm: jvmArgs,
            token,
        };
    }

    public async login(credentials: Credentials, auth_provider: string): Promise<LauncherAccount | null> {
        try {
            if (await this.accounts.hasAccount(credentials, auth_provider)) {
                logger.warn("⚠️  An account with these credentials already exists! Skipping login. 🐾");
                return null;
            }

            const auth = await getAuthProvider(auth_provider);
            if (!auth) {
                logger.error(`❌ Could not resolve the auth provider: '${auth_provider}'`);
                return null;
            }
            this.auth_provider = auth;

            auth.set_credentials(credentials.email, credentials.password);

            logger.log("🔐 Authenticating... Please wait.");
            const token = await auth.authenticate();

            if (!token) {
                await logPopupError("Authentication Error", "🚫 Authentication failed — invalid credentials or network error.", true);
                return null;
            }

            await this.accounts.addAccount(token);
            await this.accounts.selectAccount(token.id);
            this.currentAccount = token;

            logger.log(`✅ Logged in as ${token.name} [${token.uuid}] via "${auth_provider}" 🎉`);
            return token;
        } catch (err) {
            await logPopupError("Authentication Error", "💥 Unexpected error during login:"+(err as Error).message, true);
            return null;
        }
    }

    public async choose_profile() {
        return this.profiles.chooseProfile();
    }

    public async choose_account() {
        return this.accounts.chooseAccount();
    }

    public getJava(java: string): Promise<string | null> {
        return new Promise(resolve => {
            exec(`"${java}" -version`, (error, stdout, stderr) => {
                if (error) {
                    resolve(null);
                } else {
                    let version_match = stderr.match(/"(.*?)"/);
                    resolve(version_match ? version_match.pop() || null : null)
                }
            })
        })
    }

    public async run_minecraft(_name?: string): Promise<string | null> {
        let mc_dir = minecraft_dir();
        let version_dir = path.join(mc_dir, 'versions');
        let cache_dir = path.join(mc_dir, '.cache');
        let selected_profile = this.profiles.getSelectedProfile();

        let name = selected_profile?.name || _name;

        if (!_name && (!selected_profile || !name) || !name) {
            await logPopupError('Profile Error', chalk.bgHex('#f87171').hex('#fff')(' 💔 No profile selected! ') + chalk.hex('#fca5a5')('Please pick a profile before launching the game.'), true)
            return null;
        }

        if(selected_profile) this.settings.setProfile(selected_profile)
        else this.settings.setProfile();

        let version_path = path.join(version_dir, name);
        let version_json = path.join(version_path, `${name}.json`);

        let version_object = this.jsonParser(readFileSync(version_json, { encoding: 'utf-8' }));

        if(!existsSync(version_path) || !existsSync(version_json)) {
            return null;
        }

        let origami_data = await async_minecraft_data_dir(name);
        ensureDir(origami_data);

        try {
            let java = await temurin.select(false, selected_profile?.origami.version);
            let auth = await this.get_auth();

            if(!java || !auth) return null;

            return await new Promise(async(resolve) => {
                let libraryRoot = path.join(mc_dir, 'libraries')
                let assetRoot = path.join(mc_dir, 'assets');
                let version = this.getVersion(version_json);
                let loader = this.installers.get(this.installers.list().sort((a, b) => b.length - a.length).find(ld => name.toLowerCase().startsWith(ld) || name.toLowerCase().includes(ld)) || 'vanilla');

                let installed_java = await this.getJava(java.path);
                let java_check = await isJavaCompatible(installed_java, version.version);

                if (!java_check.result && java_check.required) {
                    if (java_check.installed === null || isNaN(java_check.installed)) {
                        await logPopupError('Java Runtime Error', `🚫 Java isn't working or can't be found! 💔

                                    We tried running \`java -version\`, but... nothing came back. 😢
                                    That means Java might not be installed, or it's broken.

                                    ☕ Minecraft needs Java to run, It's like the heart of everything!

                                    ✨ You can install the right one by running:
                                        👉 \`origami java --install\`
                                        🌸 Or open the menu with: \`origami menu\`

                                    Once Java's ready, we'll hop right into your world~ 💖🐇`, true);
                    } else {
                        await logPopupError('Java Runtime Error', `🐾 Aww, your Java version doesn't match what we need! ⚠️

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
                    logger.log(`⚠️  Additional JVM Flags: ${additional_jvm}`);
                    jvmArgs = `${jvmArgs} ${additional_jvm}`
                }

                if (loader && loader.metadata.unstable) {
                    logger.warn(`⚠️  Heads up! ${loader.metadata.name} support is a bit wobbly right now — it might break or misbehave 🧪👀`);
                }

                const getOS = () => {
                    switch (process.platform) {
                        case 'win32': return 'windows'
                        case 'darwin': return 'osx'
                        default: return 'linux'
                    }
                }

                const parseLoaderJVM = (jvm: string, loader: InstallerProvider): string => {
                    const separator = getOS() === 'windows' ? ';' : ':';
                    const neoforged = version_object.arguments?.jvm;
                    const neoforge_jvm = neoforged && Array.isArray(neoforged) ? neoforged.join(' ') : '';
                    
                    if(loader.metadata.name.toLowerCase() === 'neoforge') return jvm
                        .replaceAll('${neoforged}', neoforge_jvm)
                        .replaceAll('${classpath_separator}', separator)
                        .replaceAll('${version_name}', name)
                        .replaceAll('${library_directory}', libraryRoot);

                    return jvm;
                }

                if (loader && loader.metadata.jvm) {
                    jvmArgs = `${parseLoaderJVM(loader.metadata.jvm, loader)} ${jvmArgs}`;
                }

                let javaPath = java.path;
                
                if (selected_profile && selected_profile.origami.metadata.name.toLowerCase() !== 'vanilla') {
                    const mod_manager = new ModrinthModManager(selected_profile);
                    const installed = mod_manager.getList().mods;

                    if (installed.length === 0) {
                        logger.log(chalk.yellow('✨ No mods installed for this profile.'));
                    } else {
                        logger.log(chalk.green.bold('\n📦 Installed:\n'));
                        installed.forEach((mod, index) => {
                            let isDisabled = mod_manager.isModDisabled(mod);

                            logger.log(chalk.cyan(`  ${isDisabled ? `${chalk.gray('(disabled)')} ` : ''}${index + 1}. ${mod}`));
                        });
                    }
                }

                let auth_token = auth.token;

                let settings = this.settings.getFixedOptions();
                let memory = settings.memory;
                let window = settings.window_size;

                let metadata = {
                    name: 'Origami',
                    version: printVersion(),
                };

                let launcher = new MCLCore();
                let instance: ILauncherOptions = {
                    authorization: this.launcherToUser(auth_token),
                    root: mc_dir,
                    customArgs: parseArgsStringToArgv(jvmArgs),
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
                    logger.warn(`Minecraft PID: ${chalk.yellow(proc?.pid || "<cannot be fetched>")}`)
                });

                launcher.on("close", (code) => {
                    resolve(`${code || 1}`);
                });
            
                launcher.on('debug', (e) => logger.log(chalk.grey(String(e)).trim()));

                launcher.on('minecraft-log', (e) => logger.log(chalk.white(String(e)).trim()));
                launcher.on('minecraft-error', (e) => logger.log(chalk.redBright(String(e)).trim()));

                launcher.on('progress', (data) => {
                    let { type, task, total } = data;
                    
                    if(!progress.has(type)) {
                        progress.create(type, total);
                        progress.start();
                    }

                    progress.updateTo(type, task);
                });

                launcher.on('progress-end', (data) => {
                    if(progress.has(data.type)) {
                        progress.stop(data.type);
                    }
                });

                launcher.on('download-status', (data) => {
                    let { name, current, total } = data;
                    
                    if(!progress.has(name)) {
                        progress.create(name, total, true);
                        progress.start();
                    }

                    progress.updateTo(name, current);
                });

                launcher.on('download', (name) => {
                    if(progress.has(name)) {
                        progress.stop(name);
                    }
                });

            })
        } catch(_) {
            return null;
        }
    }

    public configure_settings(): Promise<void> {
        return this.settings.configureOptions();
    }

    public async install_version(): Promise<void> {
        const installers = this.installers;
        const availableInstallers = installers.list()
            .map(id => installers.get(id))
            .filter((v) => v);

        if (availableInstallers.length === 0) {
            logger.warn("⚠️ No available installers found.");
            return;
        }

        const minecraft_launcher_profiles = path.join(minecraft_dir(), 'launcher_profiles.json');
        if(!existsSync(minecraft_launcher_profiles)) {
            writeFileSync(minecraft_launcher_profiles, JSON.stringify({ profiles: {} }));
        }

        const choices = availableInstallers.map(installer => ({
            name:
                (installer?.metadata.unstable ? chalk.redBright('[UNSTABLE] ') : '') +
                chalk.green(`[${installer?.metadata.author}] `) +
                chalk.hex("#c4b5fd")(installer?.metadata.name) +
                chalk.magenta(" - " + chalk.yellow(installer?.metadata.description)),
            value: installer
        }));

        const defaultInstaller = availableInstallers.find(v => v?.metadata.name.toLowerCase() === "vanilla");

        const { selected } = await inquirer.prompt([
            {
                type: "list",
                name: "selected",
                message: chalk.hex("#f472b6")("🌷 Choose a version type to install:"),
                choices,
                default: defaultInstaller
            }
        ]);

        const selectedInstaller = selected;

        if (!selectedInstaller) {
            logger.error(`❌ Installer "${selected}" not found.`);
            return;
        }

        logger.log(`🔧 Installing via ${selectedInstaller.metadata.name}...`);
        const result = await selectedInstaller.get();

        if (result) {
            logger.success(`🎉 Installed ${result.name} ${result.version} successfully!`);
        } else {
            logger.error(`❌ Installation failed.`);
        }
    }

    public async remove_account(): Promise<void> {
        const accounts = await this.accounts.listAccounts();

        if (accounts.length === 0) {
            logger.warn("⚠️ No accounts available to remove.");
            return;
        }

        const { selected } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selected',
                message: chalk.hex('#f87171')('❌ Select an account to remove:'),
                choices: accounts.map(acc => ({
                    name: `${acc.name} (${acc.uuid})`,
                    value: acc.id
                }))
            }
        ]);

        const selectedAccount = accounts.find(acc => acc.id === selected);

        if (!selectedAccount) {
            logger.error("❌ Selected account not found.");
            return;
        }

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk.red(`Are you sure you want to delete account "${selectedAccount.name}"?`),
                default: false
            }
        ]);

        if (!confirm) {
            logger.log("🔙 Account removal cancelled.");
            return;
        }

        const removed = await this.accounts.deleteAccount(selected);

        if (removed) {
            logger.success(`🗑️ Removed account "${selectedAccount.name}" successfully!`);

            const selected = await this.accounts.getSelectedAccount();
            if (!selected) {
                this.currentAccount = null;
                logger.warn("⚠️ No account is now selected.");
            } else {
                this.currentAccount = selected;
            }
        } else {
            logger.error("❌ Failed to remove the account.");
        }
    }

    public async delete_profile(): Promise<void> {
        const profiles = this.profiles.listProfiles().map(id => this.profiles.getProfile(id)).filter(v => typeof v !== 'undefined');

        if (profiles.length === 0) {
            logger.warn("⚠️ No profiles to delete.");
            return;
        }

        const { selected } = await inquirer.prompt([
            {
                type: "list",
                name: "selected",
                message: chalk.hex("#f87171")("🗑️ Select a profile/instance to delete:"),
                choices: profiles.map(p => ({
                    name: `${p.name} (${p.origami.version || "unknown"})`,
                    value: p
                }))
            }
        ]);
        const profile = selected as LauncherProfile;

        const { confirm } = await inquirer.prompt([
            {
                type: "confirm",
                name: "confirm",
                message: chalk.red(`Are you sure you want to delete the "${profile.name}" profile and all associated data?`),
                default: false
            }
        ]);

        if (!confirm) {
            logger.log("❌ Deletion cancelled.");
            return;
        }

        try {
            const mc_dir = minecraft_dir();

            const version_path = path.join(mc_dir, "versions", profile.origami.path);
            const instance_path = await async_minecraft_data_dir(profile.origami.path);

            if (existsSync(version_path)) await remove(version_path);
            if (existsSync(instance_path)) await remove(instance_path);

            this.profiles.deleteProfile(profile.origami.version);
            logger.success(`🗑️ Successfully deleted profile "${profile.name}" and its data.`);
        } catch (err) {
            logger.error(`💥 Failed to delete profile "${profile.name}":`, (err as Error).message);
        }
    }

}