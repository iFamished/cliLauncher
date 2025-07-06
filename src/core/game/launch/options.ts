import * as fs from 'fs';
import * as path from 'path';
import { getSafeConcurrencyLimit, minecraft_dir } from '../../utils/common';
import { LauncherOptions, LauncherProfile } from '../../../types/launcher';
import { confirm, input, number, select } from '@inquirer/prompts';
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

const mcDir = minecraft_dir(true);
const launcherProfilesPath = path.join(mcDir, 'settings.json');

export class LauncherOptionsManager {
    private filePath: string;
    private data: LauncherOptions;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { options: {} };
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

    public async configureOptions(profile?: LauncherProfile) {
        const configChoices = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'optionsToConfigure',
                message: 'Select which options to configure:',
                choices: [
                    { name: 'Memory Settings', value: 'memory' },
                    { name: 'Window Size', value: 'window' },
                    { name: 'Fullscreen Mode', value: 'fullscreen' },
                    { name: 'Safe Exit', value: 'safe_exit' },
                    { name: 'Max Sockets', value: 'max_sockets' },
                    { name: 'Parallel Connections', value: 'connections' },
                    { name: 'JVM Arguments (per profile)', value: 'jvm' },
                ],
                loop: false,
                pageSize: 10
            }
        ]);

        const opts = this.data.options;

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
                        console.error(chalk.red('❌ Cannot configure JVM arguments — no profile loaded.'));
                        break;
                    }
                    const jvm = await promptEditor('Edit JVM arguments (opens your $EDITOR):', {
                        default: profile.origami.jvm
                    });
                    new LauncherProfileManager().editJvm(profile.origami.version, jvm);
                    break;
            }
        }

        this.save();
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