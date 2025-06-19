"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = exports.progress = exports.logger = void 0;
const fs_1 = require("fs");
const launcher_1 = __importDefault(require("../../tools/launcher"));
const common_1 = require("../../utils/common");
const account_1 = require("../account");
const account_2 = __importDefault(require("../account/account"));
const path_1 = __importDefault(require("path"));
const temurin_1 = __importDefault(require("../../tools/temurin"));
const string_argv_1 = __importDefault(require("string-argv"));
const options_1 = __importDefault(require("./options"));
const logger_1 = require("../../tools/logger");
const defaults_1 = require("../../../config/defaults");
const chalk_1 = __importDefault(require("chalk"));
const launcher_2 = __importDefault(require("../../launcher"));
exports.logger = new logger_1.Logger();
exports.progress = exports.logger.progress();
class Handler {
    profiles = new launcher_1.default();
    accounts = new account_2.default();
    settings = new options_1.default();
    auth_provider = null;
    currentAccount;
    constructor() {
        this.currentAccount = this.accounts.getSelectedAccount();
    }
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
        let version_data = this.jsonParser((0, fs_1.readFileSync)(versionJson, { encoding: "utf-8" }));
        return {
            version: version_data["inheritsFrom"] || version_data["id"],
            type: version_data["type"] || "release",
        };
    }
    async get_auth() {
        if (!this.currentAccount) {
            exports.logger.warn("⚠️  No account selected! Please log in first. 🐾");
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
            exports.logger.warn("🚫 Authentication token could not be retrieved.");
            return null;
        }
        return {
            jvm: jvmArgs,
            token,
        };
    }
    async login(credentials, auth_provider) {
        try {
            if (this.accounts.hasAccount(credentials, auth_provider)) {
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
                exports.logger.error("🚫 Authentication failed — invalid credentials or network error.");
                return null;
            }
            this.accounts.addAccount(token);
            this.accounts.selectAccount(token.id);
            this.currentAccount = this.accounts.getSelectedAccount();
            exports.logger.log(`✅ Logged in as ${token.name} [${token.uuid}] via "${auth_provider}" 🎉`);
            return token;
        }
        catch (err) {
            exports.logger.error("💥 Unexpected error during login:", err.message);
            return null;
        }
    }
    async run_minecraft(name) {
        let mc_dir = (0, common_1.minecraft_dir)();
        let version_dir = path_1.default.join(mc_dir, 'versions');
        let cache_dir = path_1.default.join(mc_dir, '.cache');
        let version_path = path_1.default.join(version_dir, name);
        let version_json = path_1.default.join(version_path, `${name}.json`);
        if (!(0, fs_1.existsSync)(version_path) || !(0, fs_1.existsSync)(version_json)) {
            return null;
        }
        try {
            let java = await temurin_1.default.select();
            let auth = await this.get_auth();
            if (!java || !auth)
                return null;
            return await new Promise(async (resolve) => {
                let libraryRoot = path_1.default.join(mc_dir, 'libraries');
                let assetRoot = path_1.default.join(mc_dir, 'assets');
                let jvmArgs = `${auth.jvm}`;
                let javaPath = java.path;
                let auth_token = auth.token;
                let version = this.getVersion(version_json);
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
                        cwd: version_path,
                        detached: settings.safe_exit,
                        maxSockets: settings.max_sockets,
                        versionName: `${metadata.name}/${metadata.version}`,
                    },
                    launcher: metadata,
                };
                launcher.launch(instance).then((proc) => {
                    exports.logger.warn(`Minecraft PID: ${chalk_1.default.yellow(proc?.pid || "<cannot be fetched>")}`);
                });
                launcher.on("close", () => {
                    resolve(200);
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
                    ;
                    exports.progress.updateTo(type, task);
                });
                launcher.on('progress-end', (data) => {
                    if (exports.progress.has(data.type)) {
                        exports.progress.stop(data.type);
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
}
exports.Handler = Handler;
//# sourceMappingURL=handler.js.map