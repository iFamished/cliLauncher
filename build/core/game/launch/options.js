"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LauncherOptionsManager = void 0;
exports.promptNumber = promptNumber;
exports.promptString = promptString;
exports.promptEditor = promptEditor;
exports.promptBoolean = promptBoolean;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("../../utils/common");
const prompts_1 = require("@inquirer/prompts");
const chalk_1 = __importDefault(require("chalk"));
const os_1 = __importDefault(require("os"));
const inquirer_1 = __importDefault(require("inquirer"));
const launcher_1 = __importDefault(require("../../tools/launcher"));
const java_1 = __importDefault(require("../../../java"));
const data_manager_1 = require("../../tools/data_manager");
const mcDir = (0, common_1.minecraft_dir)(true);
const launcherProfilesPath = path.join(mcDir, 'settings.json');
class LauncherOptionsManager {
    filePath;
    default_filePath;
    data;
    currentProfile;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        this.default_filePath = filePath;
        this.data = { options: {} };
        this.load();
    }
    setProfile(profile) {
        if (!profile)
            this.filePath = this.default_filePath;
        else {
            let instance_path = path.join(mcDir, 'instances', profile.origami.path);
            (0, common_1.ensureDir)(instance_path);
            this.filePath = path.join(instance_path, 'origami_options.json');
            this.currentProfile = profile;
        }
        ;
        if (!fs.existsSync(this.filePath)) {
            this.save();
        }
        this.load();
    }
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.data = raw.options ? raw : { options: {} };
            }
            catch (err) {
                console.error('Failed to parse launcher_profiles.json:', err);
            }
        }
        else {
            this.save();
        }
    }
    save() {
        const fullData = fs.existsSync(this.filePath)
            ? JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
            : {};
        fullData.options = this.data.options;
        fs.writeFileSync(this.filePath, JSON.stringify(fullData, null, 2));
    }
    reset() {
        fs.writeFileSync(this.filePath, JSON.stringify({ options: {} }, null, 2));
    }
    async configureOptions() {
        const choices = [];
        if (this.currentProfile) {
            choices.push(new prompts_1.Separator(`-- Selected Profile Settings --`));
            choices.push({ name: 'JVM Arguments (per profile)', value: 'jvm' });
            choices.push({ name: 'Java Runtime (per profile)', value: 'java' });
        }
        else {
            choices.push(new prompts_1.Separator(`-- Global --`));
            choices.push({ name: 'Allow Offline Auth (EXPERIMENTAL AND NOT RECOMMEMDED)', value: '__offline_auth' });
        }
        ;
        const global_options = [
            { name: 'Memory Settings', value: 'memory' },
            { name: 'Window Size', value: 'window' },
            { name: 'Fullscreen Mode', value: 'fullscreen' },
            { name: 'Safe Exit', value: 'safe_exit' },
            { name: 'Max Sockets', value: 'max_sockets' },
            { name: 'Parallel Connections', value: 'connections' },
        ];
        const configChoices = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'optionsToConfigure',
                message: 'Select which options to configure:',
                choices: choices.concat(global_options),
                loop: false,
                pageSize: 10
            }
        ]);
        const opts = this.data.options;
        const profile = this.currentProfile;
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
                        default: opts.connections || (0, common_1.getSafeConcurrencyLimit)(),
                        max: (0, common_1.getSafeConcurrencyLimit)()
                    });
                    break;
                case 'jvm':
                    if (!profile) {
                        console.error(chalk_1.default.red('❌ Cannot configure JVM arguments — no selected profile loaded.'));
                        break;
                    }
                    const jvm = await promptEditor('Edit JVM arguments (opens your $EDITOR):', {
                        default: profile.origami.jvm
                    });
                    new launcher_1.default().editJvm(profile.origami.version, jvm);
                    break;
                case 'java':
                    if (!profile) {
                        console.error(chalk_1.default.red('❌ Cannot configure Java Runtime — no selected profile loaded.'));
                        break;
                    }
                    await java_1.default.select(true, profile.origami.version);
                    break;
                case '__offline_auth':
                    console.warn("⚠️  Offline authentication is experimental and not recommended by Mojang.");
                    console.warn("   Use only if you have no internet and understand the risks.\n");
                    let new_setting = await promptBoolean('Allow Offline Authentication?', false);
                    (0, data_manager_1.set)('allow:offline_auth', new_setting);
                    break;
            }
        }
        if (this.currentProfile) {
            this.currentProfile = void 0;
            this.filePath = this.default_filePath;
        }
        this.save();
    }
    getFixedOptions() {
        const opts = this.data.options;
        const memory = {
            min: opts.memory?.min ?? "512M",
            max: opts.memory?.max ?? "2G"
        };
        return {
            memory,
            window_size: opts.window_size,
            fullscreen: opts.fullscreen ?? false,
            safe_exit: opts.safe_exit ?? false,
            max_sockets: opts.max_sockets ?? 8,
            connections: opts.connections ?? (0, common_1.getSafeConcurrencyLimit)(),
        };
    }
    setOption(key, value) {
        this.data.options[key] = value;
        this.save();
    }
}
exports.LauncherOptionsManager = LauncherOptionsManager;
function logIndented(lines, indent = 4) {
    const pad = ' '.repeat(indent);
    const arr = Array.isArray(lines) ? lines : [lines];
    arr.forEach((line) => console.log(pad + line));
}
function formatJvmMem(mb) {
    return mb % 1024 === 0 && mb !== 0 ? `${mb / 1024}G` : `${mb}M`;
}
function colorByThreshold(v, total, remain) {
    const ratio = v / total;
    if (ratio >= 0.85)
        return chalk_1.default.red(`${v} MB`);
    if (v > remain)
        return chalk_1.default.hex('#FFA500')(`${v} MB`);
    return `${v} MB`;
}
async function askMemoryLimits(mem) {
    const freeMB = Math.floor(os_1.default.freemem() / 1024 / 1024);
    const totalMB = Math.floor(os_1.default.totalmem() / 1024 / 1024);
    const step = 128;
    console.log('🐧 Detected free RAM:');
    logIndented([
        `-> Free: ${freeMB} MB`,
        `-> Total: ${totalMB} MB`
    ], 4);
    console.log();
    const options = [];
    for (let v = step; v <= totalMB; v += step)
        options.push(v);
    const min = await (0, prompts_1.select)({
        message: 'Choose MINIMUM RAM (MB):',
        choices: options.map((v) => ({
            name: colorByThreshold(v, totalMB, freeMB),
            value: v,
        })),
        default: mem?.min || step,
        loop: false,
    });
    const maxOptions = options.filter((v) => v >= min);
    const max = await (0, prompts_1.select)({
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
async function askWindowConfig(def) {
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
    return await (0, prompts_1.select)({
        message: 'Select window resolution:',
        default: def,
        choices
    });
}
async function promptNumber(message, opts) {
    const { min, max, default: def } = opts ?? {};
    return (await (0, prompts_1.number)({ message, min, max, default: def })) || def || 0;
}
async function promptString(message, opts) {
    const { default: def } = opts ?? {};
    return (await (0, prompts_1.input)({ message, default: def })) || def || "";
}
async function promptEditor(message, opts) {
    const { default: def } = opts ?? {};
    let editor = await inquirer_1.default.prompt([
        {
            type: 'editor',
            name: 'jvmArgs',
            message: message,
            default: def,
        }
    ]);
    return editor.jvmArgs;
}
async function promptBoolean(message, defaultValue = false) {
    return await (0, prompts_1.confirm)({ message, default: defaultValue });
}
exports.default = LauncherOptionsManager;
//# sourceMappingURL=options.js.map