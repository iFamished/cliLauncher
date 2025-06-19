import child from "child_process";
import path from "path";
import Handler from "./handler";
import fs from "fs";
import EventEmitter from "events";
import chalk from "chalk";
import { ILauncherOptions } from "./types";

export default class MCLCore extends EventEmitter {
    public options: ILauncherOptions | null = null;
    public handler: Handler | null = null;

    public async launch (options: ILauncherOptions) {
        try {
            this.options = { ...options }
            this.options.root = path.resolve(this.options.root)
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
            }

            this.handler = new Handler(this);

            this.printVersion();

            const java: any = await this.handler.checkJava(this.options.javaPath || 'java');
            if (!java.run) {
                this.emit('debug', `[MCLC]: Couldn't start Minecraft due to: ${java.message}`);
                this.emit('close', 1);
                return null;
            }

            this.createRootDirectory();
            this.createGameDirectory();

            await this.extractPackage();

            const directory = this.options.overrides.directory || path.join(this.options.root, 'versions', this.options.version.custom ? this.options.version.custom : this.options.version.number);
            this.options.directory = directory;

            const versionFile: any = await this.handler.getVersion();
            const mcPath = this.options.overrides.minecraftJar || (this.options.version.custom
                ? path.join(this.options.root, 'versions', this.options.version.custom, `${this.options.version.custom}.jar`)
                : path.join(directory, `${this.options.version.number}.jar`));
            this.options.mcPath = mcPath;
            const nativePath = await this.handler.getNatives();

            if (!fs.existsSync(mcPath)) {
                this.emit('debug', '[MCLC]: Attempting to download Minecraft version jar');
                await this.handler.getJar();
            }

            const modifyJson = await this.getModifyJson();

            const args: string[] = [];

            let jvm = [
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
                if (parseInt(versionFile.id.split('.')[1]) > 12) jvm.push(await this.handler.getJVM());
            } else jvm.push(await this.handler.getJVM());

            if (this.options.customArgs) jvm = jvm.concat(this.options.customArgs)
            if (this.options.overrides.logj4ConfigurationFile) {
                jvm.push(`-Dlog4j.configurationFile=${path.resolve(this.options.overrides.logj4ConfigurationFile)}`);
            }
            // https://help.minecraft.net/hc/en-us/articles/4416199399693-Security-Vulnerability-in-Minecraft-Java-Edition
            if (parseInt(versionFile.id.split('.')[1]) === 18 && !parseInt(versionFile.id.split('.')[2])) jvm.push('-Dlog4j2.formatMsgNoLookups=true');
            if (parseInt(versionFile.id.split('.')[1]) === 17) jvm.push('-Dlog4j2.formatMsgNoLookups=true');
            if (parseInt(versionFile.id.split('.')[1]) < 17) {
                if (!jvm.find(arg => arg.includes('Dlog4j.configurationFile'))) {
                    const configPath = path.resolve(this.options.overrides.cwd || this.options.root);
                    const intVersion = parseInt(versionFile.id.split('.')[1]);
                    if (intVersion >= 12) {
                        await this.handler.downloadAsync('https://launcher.mojang.com/v1/objects/02937d122c86ce73319ef9975b58896fc1b491d1/log4j2_112-116.xml',
                        configPath, 'log4j2_112-116.xml', true, 'log4j');
                        jvm.push('-Dlog4j.configurationFile=log4j2_112-116.xml');
                    } else if (intVersion >= 7) {
                        await this.handler.downloadAsync('https://launcher.mojang.com/v1/objects/dd2b723346a8dcd48e7f4d245f6bf09e98db9696/log4j2_17-111.xml',
                        configPath, 'log4j2_17-111.xml', true, 'log4j');
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
            const jar = fs.existsSync(mcPath)
                ? `${separator}${mcPath}`
                : `${separator}${path.join(directory, `${this.options.version.number}.jar`)}`;
            classPaths.push(`${this.options.forge ? this.options.forge + separator : ''}${classes.join(separator)}${jar}`);
            classPaths.push(file.mainClass);

            this.emit('debug', '[MCLC]: Attempting to download assets');
            await this.handler.getAssets();

            // Forge -> Custom -> Vanilla
            const launchOptions = await this.handler.getLaunchOptions(modifyJson) || [];

            const launchArguments = args.concat(jvm, classPaths, launchOptions);
            this.emit('arguments', launchArguments);
            this.emit('debug', `[MCLC]: Launching with arguments: ${chalk.cyan(launchArguments.join(' '))}`);

            return this.startMinecraft(launchArguments);
        } catch (e) {
            throw e;
            
        }
    }

    public printVersion () {
        if (fs.existsSync(path.join(__dirname, '..', '..', '..', 'package.json'))) {
            const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), { encoding: "utf-8" }));
            this.emit('debug', `[MCLC]: Origami version: ${version}`);
        } else { this.emit('debug', '[MCLC]: Package JSON not found, skipping Origami version check.') }
    }

    public createRootDirectory () {
        if(!this.options) return;

        if (!fs.existsSync(this.options.root)) {
            this.emit('debug', '[MCLC]: Attempting to create root folder');
            fs.mkdirSync(this.options.root);
        }
    }

    public createGameDirectory () {
        if(!this.options || !this.options.overrides) return;

        if (this.options.overrides.gameDirectory) {
            this.options.overrides.gameDirectory = path.resolve(this.options.overrides.gameDirectory);
            if (!fs.existsSync(this.options.overrides.gameDirectory)) {
                fs.mkdirSync(this.options.overrides.gameDirectory, { recursive: true });
            }
        }
    }

    public async extractPackage () {
        if(!this.options || !this.handler) return;

        if (this.options.clientPackage) {
            this.emit('debug', `[MCLC]: Extracting client package to ${this.options.root}`);
            await this.handler.extractPackage();
        }
    }

    public async getModifyJson () {
        let modifyJson = null;

        if(!this.options || !this.handler) return;

        if (this.options.forge) {
            this.options.forge = path.resolve(this.options.forge);
            modifyJson = await this.handler.getForgedWrapped();
        } else if (this.options.version.custom) {
            modifyJson = modifyJson || JSON.parse(fs.readFileSync(path.join(this.options.root, 'versions', this.options.version.custom, `${this.options.version.custom}.json`), { encoding: 'utf8' }));
        }

        return modifyJson;
    }

    public startMinecraft(launchArguments: string[]) {
        if(!this.options || !this.options.overrides) return;

        const minecraft = child.spawn(this.options.javaPath ? this.options.javaPath : 'java', launchArguments,
            { cwd: this.options.overrides.cwd || this.options.root, detached: this.options.overrides.detached });
        const master = this;

        minecraft.stdout.on('data', parseLogs);
        minecraft.stderr.on('data', parseLogs);

        function parseLogs(data: any) {
            const raw = data.toString('utf-8').trim();
            const lower = raw.toLowerCase();

            if (lower.includes("error") || lower.includes("exception in thread")) {
                return master.emit("minecraft-error", raw);
            }

            const logColorRules: { pattern: RegExp; colorize: (text: string) => string }[] = [
                { pattern: /\[authlib-injector\]/, colorize: chalk.hex('#888888') },         // soft gray
                { pattern: /\[download-/, colorize: chalk.hex('#00CFFF') },                  // bright cyan (Download)
                { pattern: /\[worker-main-/, colorize: chalk.hex('#3B82F6') },               // blue-500 (Worker)
                { pattern: /\[modloading-worker-/, colorize: chalk.hex('#FBBF24') },         // yellow-400 (MOD)
                { pattern: /\[render thread\//, colorize: chalk.hex('#D946EF') },            // fuchsia-400 (Render)
                { pattern: /\[server thread\//, colorize: chalk.hex('#EC4899') },            // pink-500 (Server)
                { pattern: /\[datafixer bootstrap/, colorize: chalk.hex('#4F46E5') },        // indigo-600 (Bootstrap)
                { pattern: /\[io-worker-/, colorize: chalk.hex('#10B981') },                 // emerald-500 (I/O)
                { pattern: /\[earlydisplay\//, colorize: chalk.hex('#10B981') },            // emerald-500 (EarlyDiplay)

                // Specific thread log pattern like [main/INFO]
                { pattern: /\[main/, colorize: chalk.hex('#60A5FA') },               // blue-400 (Main Info)

                // Fallbacks for logging levels
                { pattern: /\binfo\b/, colorize: chalk.hex('#93C5FD') },                     // blue-300
                { pattern: /\bwarn\b/, colorize: chalk.hex('#FBBF24') },                     // yellow-400
                { pattern: /\berror\b/, colorize: chalk.hex('#F87171') },                    // red-400
                { pattern: /\bdebug\b/, colorize: chalk.hex('#A78BFA') },                    // violet-400
                { pattern: /\bfatal\b/, colorize: chalk.hex('#EF4444') },                    // red-500
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

        return minecraft
    }
}
