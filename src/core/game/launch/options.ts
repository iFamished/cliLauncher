import * as fs from 'fs';
import * as path from 'path';
import { ensureDir, getSafeConcurrencyLimit, minecraft_dir, sync_minecraft_data_dir } from '../../utils/common';
import { LauncherOptions, LauncherProfile } from '../../../types/launcher';
import { confirm, input, number, select, Separator } from '@inquirer/prompts';
import chalk from "chalk";
import os from 'os';
import {
    MemoryOptions,
    FIXED_Options,
    FIXED_MemoryOptions,
    Options,
    WindowSize
} from '../../../types/launcher_options';
import inquirer from 'inquirer';
import LauncherProfileManager from '../../tools/launcher';
import temurin, { JavaBinary } from '../../../java';
import { get, set } from '../../tools/data_manager';

const launcherProfilesPath = path.join(minecraft_dir(true), 'settings.json');
const legacy_210_settings = path.join(minecraft_dir(), 'origami_files', 'settings.json');

export class LauncherOptionsManager {
    private filePath: string;
    private default_filePath: string;
    private data: LauncherOptions;

    private currentProfile?: LauncherProfile;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;

        if(fs.existsSync(legacy_210_settings)) {
            fs.writeFileSync(filePath, fs.readFileSync(legacy_210_settings));
            
            setTimeout(() => fs.unlinkSync(legacy_210_settings), 500);
        }

        this.default_filePath = filePath;
        this.data = { options: {} };
        this.load();
    }

    setProfile(profile?: LauncherProfile) {
        if(!profile) this.filePath = this.default_filePath;
        else {
            let instance_path = sync_minecraft_data_dir(profile.origami.path, true);
            ensureDir(instance_path);

            this.filePath = path.join(instance_path, 'origami_options.json');
            this.currentProfile = profile;
        };

        if(!fs.existsSync(this.filePath)) {
            this.save();
        }

        this.load();
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.data = raw.options ? (raw as LauncherOptions) : { options: {} };
            } catch (err) {
                console.error('Failed to parse launcher_profiles.json:', err);
            }
        } else {
            this.save();
        }
    }

    private save() {
        const fullData = fs.existsSync(this.filePath)
            ? JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
            : {};

        fullData.options = this.data.options;
        fs.writeFileSync(this.filePath, JSON.stringify(fullData, null, 2));
    }

    reset() {
        fs.writeFileSync(this.filePath, JSON.stringify({ options: {} }, null, 2));
    }

    public async configureOptions() {
        const opts = this.data.options;
        const profile = this.currentProfile;
        const choices: any[] = [];

        if (profile) {
            choices.push(new Separator(`-- Selected Profile Settings --`));

            const jvmValue = profile.origami.jvm ? ` (current: ${profile.origami.jvm.slice(0, 32)}...)` : '';
            choices.push({ name: `JVM Arguments${jvmValue}`, value: 'jvm' });

            const java: JavaBinary | undefined = get('use:temurin');
            const javaLabel = java
                ? `Java Runtime [${java.version ?? 'unknown version'} - ${java.provider ?? 'manual'}] (${java.path || '<unknown path>'})`
                : 'Java Runtime [not set]';
            
            choices.push({ name: javaLabel, value: 'java' });
        } else {
            choices.push(new Separator(`-- Global Options --`));
            const allowOffline = get('allow:offline_auth');
            choices.push({ name: `Allow Offline Auth [${allowOffline ? 'ENABLED' : 'DISABLED'}]`, value: '__offline_auth' });

            const universalDataFolder = get('universal:dir');
            choices.push({ name: `Universal Game Directory [${universalDataFolder ? 'ENABLED' : 'DISABLED'}]`, value: '__universal_dir' });
        }

        const global_options: any[] = [
            { name: `Memory Settings [min: ${opts.memory?.min ?? '512M'}, max: ${opts.memory?.max ?? '2G'}]`, value: 'memory' },
            {
                name: `Window Size [${opts.fullscreen ? 'Fullscreen' : `${opts.window_size?.width ?? '-'}x${opts.window_size?.height ?? '-'}`}]`,
                value: 'window'
            },
            { name: `Fullscreen Mode [${opts.fullscreen ? 'ENABLED' : 'DISABLED'}]`, value: 'fullscreen' },
            { name: `Safe Exit [${opts.safe_exit ? 'ENABLED' : 'DISABLED'}]`, value: 'safe_exit' },
            { name: `Max Sockets [${opts.max_sockets ?? 8}]`, value: 'max_sockets' },
            { name: `Parallel Connections [${opts.connections ?? getSafeConcurrencyLimit()}]`, value: 'connections' },
        ];

        const configChoices = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'optionsToConfigure',
                message: 'Select which options to configure:',
                choices: choices.concat(global_options).concat([
                    new Separator(),
                    { name: chalk.red('🗑️  Reset All Settings to Defaults'), value: '__reset' },
                ]),
                loop: false,
                pageSize: 10
            }
        ]);

        for (const item of configChoices.optionsToConfigure) {
            switch (item) {
                case 'memory':
                    opts.memory = await askMemoryLimits(opts.memory);
                    break;
                case 'window':
                    const window = await askWindowConfig(opts.window_size);
                    opts.window_size = window.fullscreen ? undefined : window;
                    opts.fullscreen = window.fullscreen;
                    break;
                case 'fullscreen':
                    opts.fullscreen = await promptBoolean('Enable fullscreen?', opts.fullscreen ?? false);
                    break;
                case 'safe_exit':
                    opts.safe_exit = await promptBoolean('Enable safe exit?', opts.safe_exit ?? false);
                    break;
                case 'max_sockets':
                    opts.max_sockets = await promptNumber('Set max sockets:', {
                        min: 1,
                        default: opts.max_sockets || 8
                    });
                    break;
                case 'connections':
                    opts.connections = await promptNumber('Set parallel connections:', {
                        min: 8,
                        default: opts.connections || getSafeConcurrencyLimit(),
                        max: getSafeConcurrencyLimit()
                    });
                    break;
                case 'jvm':
                    if (!profile) {
                        console.error(chalk.red('❌ Cannot configure JVM arguments — no selected profile loaded.'));
                        break;
                    }
                    const jvm = await promptEditor('Edit JVM arguments (opens your $EDITOR):', {
                        default: profile.origami.jvm
                    });
                    new LauncherProfileManager().editJvm(profile.origami.version, jvm);
                    break;
                case 'java':
                    if (!profile) {
                        console.error(chalk.red('❌ Cannot configure Java Runtime — no selected profile loaded.'));
                        break;
                    }
                    await temurin.select(true, profile.origami.version);
                    break;
                case '__offline_auth':
                    console.warn("⚠️  Offline authentication is experimental and not recommended by Mojang.");
                    console.warn("   Use only if you have no internet and understand the risks.\n");

                    let new_setting = await promptBoolean('Allow Offline Authentication?', false);

                    set('allow:offline_auth', new_setting);
                    break;
                case '__universal_dir':
                    let default_univeraal = get('universal:dir') ? true : false;
                    let universal = await promptBoolean('Universal Game Directory', default_univeraal);

                    set('universal:dir', universal);
                    break;
                case '__reset': // 🆕
                    const confirmReset = await promptBoolean('Are you sure you want to reset all settings to default?', false);
                    if (confirmReset) {
                        this.reset();

                        set('allow:offline_auth', false);
                        set('universal:dir', false);

                        console.log(chalk.green('✅ All settings have been reset.'));
                        this.load();
                    }
                    break;
            }
        }

        this.save();

        if(this.currentProfile) {
            this.currentProfile = void 0;
            this.filePath = this.default_filePath;
        }
    }

    public getFixedOptions(): FIXED_Options {
        const opts = this.data.options;
        const memory: FIXED_MemoryOptions = {
            min: opts.memory?.min ?? "512M",
            max: opts.memory?.max ?? "2G"
        };

        return {
            memory,
            window_size: opts.window_size,
            fullscreen: opts.fullscreen ?? false,
            safe_exit: opts.safe_exit ?? false,
            max_sockets: opts.max_sockets ?? 8,
            connections: opts.connections ?? getSafeConcurrencyLimit(),
        };
    }

    public setOption<K extends keyof Options>(key: K, value: Options[K]) {
        this.data.options[key] = value;
        this.save();
    }
}

function logIndented(lines: string | string[], indent: number = 4) {
    const pad = ' '.repeat(indent);
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((line) => console.log(pad + line));
}

function formatJvmMem(mb: number): string {
    return mb % 1024 === 0 && mb !== 0 ? `${mb / 1024}G` : `${mb}M`;
}

function colorByThreshold(v: number, total: number, remain: number): string {
    const ratio = v / total;
    if (ratio >= 0.85) return chalk.red(`${v} MB`);
    if (v > remain) return chalk.hex('#FFA500')(`${v} MB`);
    return `${v} MB`;
}

async function askMemoryLimits(mem?: MemoryOptions): Promise<MemoryOptions> {
    const freeMB = Math.floor(os.freemem() / 1024 / 1024);
    const totalMB = Math.floor(os.totalmem() / 1024 / 1024);
    const step = 128;

    console.log('🐧 Detected free RAM:');
    logIndented([
        `-> Free: ${freeMB} MB`,
        `-> Total: ${totalMB} MB`
    ], 4);
    console.log();

    const options: number[] = [];
    for (let v = step; v <= totalMB; v += step) options.push(v);

    const min = await select<number>({
        message: 'Choose MINIMUM RAM (MB):',
        choices: options.map((v) => ({
        name: colorByThreshold(v, totalMB, freeMB),
        value: v,
        })),
        default: mem?.min || step,
        loop: false,
    });

    const maxOptions = options.filter((v) => v >= min);
    const max = await select<number>({
        message: 'Choose MAXIMUM RAM (MB):',
        choices: maxOptions.map((v) => ({
            name: colorByThreshold(v, totalMB, freeMB),
            value: v,
        })),
        default: mem?.max || min || step,
        loop: false,
    });

    console.log();
    console.log('✅ Memory configuration summary:');
    logIndented([`Min → ${min} MB`, `Max → ${max} MB`], 4);

    return { min: formatJvmMem(min), max: formatJvmMem(max) };
}

async function askWindowConfig(def?: WindowSize) {
    const choices = [
        { name: '640x480 (VGA, 4:3)', value: { fullscreen: false, width: 640, height: 480 } },
        { name: '800x600 (SVGA, 4:3)', value: { fullscreen: false, width: 800, height: 600 } },
        { name: '1280x720 (HD, 16:9)', value: { fullscreen: false, width: 1280, height: 720 } },
        { name: '1366x768 (HD+, 16:9)', value: { fullscreen: false, width: 1366, height: 768 } },
        { name: '1440x900 (WXGA+, 16:10)', value: { fullscreen: false, width: 1440, height: 900 } },
        { name: '1920x1080 (Full HD, 16:9)', value: { fullscreen: false, width: 1920, height: 1080 } },
        { name: '2560x1440 (QHD / 2K, 16:9)', value: { fullscreen: false, width: 2560, height: 1440 } },
        { name: '3440x1440 (UWQHD, 21:9)', value: { fullscreen: false, width: 3440, height: 1440 } },
        { name: '3840x2160 (4K UHD, 16:9)', value: { fullscreen: false, width: 3840, height: 2160 } },
        { name: '5120x2880 (5K, 16:9)', value: { fullscreen: false, width: 5120, height: 2880 } },
        { name: '7680x4320 (8K UHD, 16:9)', value: { fullscreen: false, width: 7680, height: 4320 } },
        { name: 'Fullscreen', value: { fullscreen: true } }
    ];

    return await select<{ fullscreen: boolean; width?: number; height?: number }>({
        message: 'Select window resolution:',
        default: def,
        choices
    });
}

export async function promptNumber(message: string, opts?: { min?: number; max?: number; default?: number }): Promise<number> {
    const { min, max, default: def } = opts ?? {};
    return (await number({ message, min, max, default: def })) || def || 0;
}

export async function promptString(message: string, opts?: { default?: string }): Promise<string> {
    const { default: def } = opts ?? {};
    return (await input({ message, default: def })) || def || "";
}

export async function promptEditor(message: string, opts?: { default?: string }): Promise<string> {
    const { default: def } = opts ?? {};

    let editor = await inquirer.prompt([
        {
            type: 'editor',
            name: 'jvmArgs',
            message: message,
            default: def,
        }
    ]);

    return editor.jvmArgs;
}

export async function promptBoolean(message: string, defaultValue = false): Promise<boolean> {
    return await confirm({ message, default: defaultValue });
}

export default LauncherOptionsManager;