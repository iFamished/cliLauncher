import { existsSync, readFileSync } from "fs";
import { AUTH_PROVIDERS, Credentials, IAuthProvider } from "../../../types/account";
import { LauncherAccount } from "../../../types/launcher";
import LauncherProfileManager from "../../tools/launcher";
import { minecraft_dir, printVersion } from "../../utils/common";
import { getAuthProvider } from "../account";
import LauncherAccountManager from "../account/account";
import path from "path";
import temurin from "../../tools/temurin";
import parseArgsStringToArgv from "string-argv";
import LauncherOptionsManager from "./options";
import { Logger } from "../../tools/logger";
import { ORIGAMI_CLIENT_TOKEN } from "../../../config/defaults";
import chalk from "chalk";
import MCLCore from "../../launcher";
import { ILauncherOptions, IUser } from "../../launcher/types";
import { InstallerRegistry } from "../install/registry";
import inquirer from "inquirer";

export const logger = new Logger();
export const progress = logger.progress();

export class Handler {
    public profiles: LauncherProfileManager = new LauncherProfileManager();
    public accounts: LauncherAccountManager = new LauncherAccountManager();
    public settings: LauncherOptionsManager = new LauncherOptionsManager();
    public installers: InstallerRegistry = new InstallerRegistry();

    private auth_provider: IAuthProvider | null = null;

    private currentAccount: LauncherAccount | undefined;

    constructor() {
        this.currentAccount = this.accounts.getSelectedAccount();
    }

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
        if (!this.currentAccount) {
            logger.warn("⚠️  No account selected! Please log in first. 🐾");
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
            logger.warn("🚫 Authentication token could not be retrieved.");
            return null;
        }

        return {
            jvm: jvmArgs,
            token,
        };
    }

    public async login(credentials: Credentials, auth_provider: AUTH_PROVIDERS): Promise<LauncherAccount | null> {
        try {
            if (this.accounts.hasAccount(credentials, auth_provider)) {
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
                logger.error("🚫 Authentication failed — invalid credentials or network error.");
                return null;
            }

            this.accounts.addAccount(token);
            this.accounts.selectAccount(token.id);
            this.currentAccount = this.accounts.getSelectedAccount();

            logger.log(`✅ Logged in as ${token.name} [${token.uuid}] via "${auth_provider}" 🎉`);
            return token;
        } catch (err) {
            logger.error("💥 Unexpected error during login:", (err as Error).message);
            return null;
        }
    }

    public async choose_profile() {
        return this.profiles.chooseProfile();
    }

    public async choose_account() {
        return this.accounts.chooseAccount();
    }

    public async run_minecraft(_name?: string): Promise<200 | null> {
        let mc_dir = minecraft_dir();
        let version_dir = path.join(mc_dir, 'versions');
        let cache_dir = path.join(mc_dir, '.cache');

        let name = this.profiles.getSelectedProfile()?.name || _name;

        if(!name) {
            console.log(chalk.bgHex('#f87171').hex('#fff')(' 💔 No profile selected! ') + chalk.hex('#fca5a5')('Please pick a profile before launching the game.'));
            return null;
        }

        let version_path = path.join(version_dir, name);
        let version_json = path.join(version_path, `${name}.json`);

        if(!existsSync(version_path) || !existsSync(version_json)) {
            return null;
        }

        try {
            let java = await temurin.select();
            let auth = await this.get_auth();

            if(!java || !auth) return null;

            return await new Promise(async(resolve) => {
                let libraryRoot = path.join(mc_dir, 'libraries')
                let assetRoot = path.join(mc_dir, 'assets');

                let jvmArgs = `${auth.jvm}`;

                let javaPath = java.path;

                let auth_token = auth.token;
                let version = this.getVersion(version_json);

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
                        gameDirectory: version_path,
                        cwd: version_path,
                        detached: settings.safe_exit,
                        maxSockets: settings.max_sockets,
                        versionName: `${metadata.name}/${metadata.version}`,               
                    },
                    launcher: metadata,
                };

                launcher.launch(instance).then((proc) => {
                    logger.warn(`Minecraft PID: ${chalk.yellow(proc?.pid || "<cannot be fetched>")}`)
                });

                launcher.on("close", () => {
                    resolve(200);
                });
            
                launcher.on('debug', (e) => logger.log(chalk.grey(String(e)).trim()));

                launcher.on('minecraft-log', (e) => logger.log(chalk.white(String(e)).trim()));
                launcher.on('minecraft-error', (e) => logger.log(chalk.redBright(String(e)).trim()));

                launcher.on('progress', (data) => {
                    let { type, task, total } = data;
                    
                    if(!progress.has(type)) {
                        progress.create(type, total);
                        progress.start();
                    };

                    progress.updateTo(type, task);
                });
                launcher.on('progress-end', (data) => {
                    if(progress.has(data.type)) {
                        progress.stop(data.type);
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

        const choices = availableInstallers.map(installer => ({
            name:
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
        const accounts = this.accounts.listAccounts();

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

        const removed = this.accounts.deleteAccount(selected);

        if (removed) {
            logger.success(`🗑️ Removed account "${selectedAccount.name}" successfully!`);

            const selected = this.accounts.getSelectedAccount();
            if (!selected) {
                this.currentAccount = undefined;
                logger.warn("⚠️ No account is now selected.");
            } else {
                this.currentAccount = selected;
            }
        } else {
            logger.error("❌ Failed to remove the account.");
        }
    }

}