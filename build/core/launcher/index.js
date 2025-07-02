"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = __importDefault(require("child_process"));
const path_1 = __importDefault(require("path"));
const handler_1 = __importDefault(require("./handler"));
const fs_1 = __importDefault(require("fs"));
const events_1 = __importDefault(require("events"));
const chalk_1 = __importDefault(require("chalk"));
class MCLCore extends events_1.default {
    options = null;
    handler = null;
    async launch(options) {
        try {
            this.options = { ...options };
            this.options.root = path_1.default.resolve(this.options.root);
            this.options.overrides = {
                detached: true,
                ...this.options.overrides,
                url: {
                    meta: 'https://launchermeta.mojang.com',
                    resource: 'https://resources.download.minecraft.net',
                    mavenForge: 'https://files.minecraftforge.net/maven/',
                    defaultRepoForge: 'https://libraries.minecraft.net/',
                    fallbackMaven: 'https://search.maven.org/remotecontent?filepath=',
                    ...this.options.overrides
                        ? this.options.overrides.url
                        : undefined
                },
                fw: {
                    baseUrl: 'https://github.com/ZekerZhayard/ForgeWrapper/releases/download/',
                    version: '1.6.0',
                    sh1: '035a51fe6439792a61507630d89382f621da0f1f',
                    size: 28679,
                    ...this.options.overrides
                        ? this.options.overrides.fw
                        : undefined
                }
            };
            this.handler = new handler_1.default(this);
            this.printVersion();
            const java = await this.handler.checkJava(this.options.javaPath || 'java');
            if (!java.run) {
                this.emit('debug', `[MCLC]: Couldn't start Minecraft due to: ${java.message}`);
                this.emit('close', 1);
                return null;
            }
            this.createRootDirectory();
            this.createGameDirectory();
            await this.extractPackage();
            const directory = this.options.overrides.directory || path_1.default.join(this.options.root, 'versions', this.options.version.custom ? this.options.version.custom : this.options.version.number);
            this.options.directory = directory;
            const versionFile = await this.handler.getVersion();
            const mcPath = this.options.overrides.minecraftJar || (this.options.version.custom
                ? path_1.default.join(this.options.root, 'versions', this.options.version.custom, `${this.options.version.custom}.jar`)
                : path_1.default.join(directory, `${this.options.version.number}.jar`));
            this.options.mcPath = mcPath;
            const nativePath = await this.handler.getNatives();
            if (!fs_1.default.existsSync(mcPath)) {
                this.emit('debug', '[MCLC]: Attempting to download Minecraft version jar');
                await this.handler.getJar();
            }
            const modifyJson = await this.getModifyJson();
            const args = [];
            let jvm = [
                "--add-opens", "java.base/java.lang.invoke=ALL-UNNAMED",
                '-XX:-UseAdaptiveSizePolicy',
                '-XX:-OmitStackTraceInFastThrow',
                '-Dfml.ignorePatchDiscrepancies=true',
                '-Dfml.ignoreInvalidMinecraftCertificates=true',
                `-Dminecraft.launcher.brand=${this.options.launcher.name}`,
                `-Dminecraft.launcher.version=${this.options.launcher.version}`,
                `-Djava.library.path=${nativePath}`,
                `-Xmx${(this.handler.getMemory() || ["1023M"])[0]}`,
                `-Xms${(this.handler.getMemory() || ["", "512M"])[1]}`
            ];
            if (this.handler.getOS() === 'osx') {
                if (parseInt(versionFile.id.split('.')[1]) > 12)
                    jvm.push(await this.handler.getJVM());
            }
            else
                jvm.push(await this.handler.getJVM());
            if (this.options.customArgs)
                jvm = jvm.concat(this.options.customArgs);
            if (this.options.overrides.logj4ConfigurationFile) {
                jvm.push(`-Dlog4j.configurationFile=${path_1.default.resolve(this.options.overrides.logj4ConfigurationFile)}`);
            }
            // https://help.minecraft.net/hc/en-us/articles/4416199399693-Security-Vulnerability-in-Minecraft-Java-Edition
            if (parseInt(versionFile.id.split('.')[1]) === 18 && !parseInt(versionFile.id.split('.')[2]))
                jvm.push('-Dlog4j2.formatMsgNoLookups=true');
            if (parseInt(versionFile.id.split('.')[1]) === 17)
                jvm.push('-Dlog4j2.formatMsgNoLookups=true');
            if (parseInt(versionFile.id.split('.')[1]) < 17) {
                if (!jvm.find(arg => arg.includes('Dlog4j.configurationFile'))) {
                    const configPath = path_1.default.resolve(this.options.overrides.cwd || this.options.root);
                    const intVersion = parseInt(versionFile.id.split('.')[1]);
                    if (intVersion >= 12) {
                        await this.handler.downloadAsync('https://launcher.mojang.com/v1/objects/02937d122c86ce73319ef9975b58896fc1b491d1/log4j2_112-116.xml', configPath, 'log4j2_112-116.xml', true, 'log4j');
                        jvm.push('-Dlog4j.configurationFile=log4j2_112-116.xml');
                    }
                    else if (intVersion >= 7) {
                        await this.handler.downloadAsync('https://launcher.mojang.com/v1/objects/dd2b723346a8dcd48e7f4d245f6bf09e98db9696/log4j2_17-111.xml', configPath, 'log4j2_17-111.xml', true, 'log4j');
                        jvm.push('-Dlog4j.configurationFile=log4j2_17-111.xml');
                    }
                }
            }
            const classes = this.options.overrides.classes || this.handler.cleanUp(await this.handler.getClasses(modifyJson));
            const classPaths = ['-cp'];
            const separator = this.handler.getOS() === 'windows' ? ';' : ':';
            // Handling launch arguments.
            const file = modifyJson || versionFile;
            // So mods like fabric work.
            const jar = fs_1.default.existsSync(mcPath)
                ? `${separator}${mcPath}`
                : `${separator}${path_1.default.join(directory, `${this.options.version.number}.jar`)}`;
            classPaths.push(`${this.options.forge ? this.options.forge + separator : ''}${classes.join(separator)}${jar}`);
            classPaths.push(file.mainClass);
            this.emit('debug', '[MCLC]: Attempting to download assets');
            await this.handler.getAssets();
            // Forge -> Custom -> Vanilla
            const launchOptions = await this.handler.getLaunchOptions(modifyJson) || [];
            const launchArguments = args.concat(jvm, classPaths, launchOptions);
            this.emit('arguments', launchArguments);
            this.emit('debug', `[MCLC]: Launching with arguments: ${chalk_1.default.cyan(launchArguments.join(' '))}`);
            return this.startMinecraft(launchArguments);
        }
        catch (e) {
            throw e;
        }
    }
    printVersion() {
        if (fs_1.default.existsSync(path_1.default.join(__dirname, '..', '..', '..', 'package.json'))) {
            const { version } = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', '..', 'package.json'), { encoding: "utf-8" }));
            this.emit('debug', `[MCLC]: Origami version: ${version}`);
        }
        else {
            this.emit('debug', '[MCLC]: Package JSON not found, skipping Origami version check.');
        }
    }
    createRootDirectory() {
        if (!this.options)
            return;
        if (!fs_1.default.existsSync(this.options.root)) {
            this.emit('debug', '[MCLC]: Attempting to create root folder');
            fs_1.default.mkdirSync(this.options.root);
        }
    }
    createGameDirectory() {
        if (!this.options || !this.options.overrides)
            return;
        if (this.options.overrides.gameDirectory) {
            this.options.overrides.gameDirectory = path_1.default.resolve(this.options.overrides.gameDirectory);
            if (!fs_1.default.existsSync(this.options.overrides.gameDirectory)) {
                fs_1.default.mkdirSync(this.options.overrides.gameDirectory, { recursive: true });
            }
        }
    }
    async extractPackage() {
        if (!this.options || !this.handler)
            return;
        if (this.options.clientPackage) {
            this.emit('debug', `[MCLC]: Extracting client package to ${this.options.root}`);
            await this.handler.extractPackage();
        }
    }
    async getModifyJson() {
        let modifyJson = null;
        if (!this.options || !this.handler)
            return;
        if (this.options.neoforge) {
            this.options.neoforge = path_1.default.resolve(this.options.neoforge);
            const neoJsonPath = path_1.default.join(this.options.neoforge, `${path_1.default.basename(this.options.neoforge)}.json`);
            modifyJson = JSON.parse(fs_1.default.readFileSync(neoJsonPath, { encoding: 'utf8' }));
        }
        if (this.options.forge) {
            this.options.forge = path_1.default.resolve(this.options.forge);
            modifyJson = await this.handler.getForgedWrapped();
        }
        else if (this.options.version.custom) {
            modifyJson = modifyJson || JSON.parse(fs_1.default.readFileSync(path_1.default.join(this.options.root, 'versions', this.options.version.custom, `${this.options.version.custom}.json`), { encoding: 'utf8' }));
        }
        return modifyJson;
    }
    startMinecraft(launchArguments) {
        if (!this.options || !this.options.overrides)
            return;
        const minecraft = child_process_1.default.spawn(this.options.javaPath ? this.options.javaPath : 'java', launchArguments, { cwd: this.options.overrides.cwd || this.options.root, detached: this.options.overrides.detached });
        const master = this;
        minecraft.stdout.on('data', parseLogs);
        minecraft.stderr.on('data', parseLogs);
        function parseLogs(data) {
            const raw = data.toString('utf-8').trim();
            const lower = raw.toLowerCase();
            if (lower.includes("error") || lower.includes("exception in thread")) {
                return master.emit("minecraft-error", raw);
            }
            const logColorRules = [
                { pattern: /\[authlib-injector\]/, colorize: chalk_1.default.hex('#888888') }, // soft gray
                { pattern: /\[download-/, colorize: chalk_1.default.hex('#00CFFF') }, // bright cyan (Download)
                { pattern: /\[worker-main-/, colorize: chalk_1.default.hex('#3B82F6') }, // blue-500 (Worker)
                { pattern: /\[modloading-worker-/, colorize: chalk_1.default.hex('#FBBF24') }, // yellow-400 (MOD)
                { pattern: /\[render thread\//, colorize: chalk_1.default.hex('#D946EF') }, // fuchsia-400 (Render)
                { pattern: /\[server thread\//, colorize: chalk_1.default.hex('#EC4899') }, // pink-500 (Server)
                { pattern: /\[datafixer bootstrap/, colorize: chalk_1.default.hex('#4F46E5') }, // indigo-600 (Bootstrap)
                { pattern: /\[io-worker-/, colorize: chalk_1.default.hex('#10B981') }, // emerald-500 (I/O)
                { pattern: /\[earlydisplay\//, colorize: chalk_1.default.hex('#10B981') }, // emerald-500 (EarlyDiplay)
                // Specific thread log pattern like [main/INFO]
                { pattern: /\[main/, colorize: chalk_1.default.hex('#60A5FA') }, // blue-400 (Main Info)
                // Fallbacks for logging levels
                { pattern: /\binfo\b/, colorize: chalk_1.default.hex('#93C5FD') }, // blue-300
                { pattern: /\bwarn\b/, colorize: chalk_1.default.hex('#FBBF24') }, // yellow-400
                { pattern: /\berror\b/, colorize: chalk_1.default.hex('#F87171') }, // red-400
                { pattern: /\bdebug\b/, colorize: chalk_1.default.hex('#A78BFA') }, // violet-400
                { pattern: /\bfatal\b/, colorize: chalk_1.default.hex('#EF4444') }, // red-500
            ];
            let colored = raw;
            for (const { pattern, colorize } of logColorRules) {
                if (pattern.test(lower)) {
                    colored = colorize(raw);
                    break;
                }
            }
            return master.emit("minecraft-log", colored);
        }
        minecraft.on('close', (code) => this.emit('close', code));
        return minecraft;
    }
}
exports.default = MCLCore;
//# sourceMappingURL=index.js.map