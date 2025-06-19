import chalk from 'chalk';
import Spinnies, { Color } from 'spinnies';
import { v4 } from 'uuid';

type LogType = 'log' | 'warn' | 'error' | 'progress' | 'success';

const tags = {
    log: chalk.hex('#00c4cc')('📝 LOG'),
    warn: chalk.hex('#ffc107')('⚠️ WARN'),
    error: chalk.hex('#ff4d6d')('❌ ERROR'),
    progress: chalk.hex('#b388ff')('⏳ PROGRESS'),
    success: chalk.greenBright('✅ SUCCESS'),
};

const logPrefix = chalk.hex('#ff80ab').bold('ORIGAMI LOG');
function getTime(): string {
    return chalk.gray(`[${new Date().toLocaleTimeString()}]`);
}

function formatMessage(type: LogType, msg: string): string {
    return `${getTime()} ${logPrefix}: ${tags[type]}: ${msg}`;
}

let loggers = {
    log: (msg: string) => console.log(formatMessage('log', msg)),
    warn: (msg: string) => console.warn(formatMessage('warn', msg)),
    error: (msg: string) => console.error(formatMessage('error', msg)),
    progress: (msg: string) => console.log(formatMessage('progress', msg)),
    success: (msg: string) => console.log(formatMessage('success', msg)),
};

type ProgressState = {
    startTime: number;
    total: number;
    value: number;
    name: string;
    id: string;
};

export interface Bar {
    increment: () => void;
    update: (amount: number) => void;
    total: (newTotal?: number) => void;
    stop: (fail?: boolean) => void;
};

function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (60 * 1000)) % 60;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

function renderBar(percent: number, width: number = 30): string {
    const complete = Math.round(percent * width);
    const incomplete = width - complete;
    return '█'.repeat(complete) + '░'.repeat(incomplete);
}

export class ProgressReport {
    private bars: Map<string, ProgressState> = new Map();
    private spinners: Spinnies = new Spinnies();
    private renderInterval: NodeJS.Timeout | null = null;

    constructor() {}

    private startRenderLoop(): void {
        if (this.renderInterval) return;

        this.renderInterval = setInterval(() => {
            this.renderAll();
            if (this.bars.size === 0) this.stopRenderLoop();
        }, 100);
    }

    private stopRenderLoop(): void {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }

    private task_logs(spinner: ProgressState, prog: number = 0, fail: boolean = false, str: string = "no logs."): { text: string, color: Color } {
        switch (prog) {
            case 0:
                return { text: formatMessage('progress', `Starting Task ${chalk.yellow(`\`${spinner.name}\``)}`), color: 'white' };
            case 1:
                return { text: formatMessage('progress', `Task ${fail ? chalk.red(`\`${spinner.name}\``) : chalk.green(`\`${spinner.name}\``)} ${fail ? 'failed.' : 'has ended successfully!'}`), color: 'white' };
            default:
                return { text: formatMessage('progress', `Task ${chalk.grey(`\`${spinner.name}\``)}: ${str}`), color: 'white' };
        }
    }

    create(name: string, total: number): Bar | null {
        if (this.bars.has(name)) {
            loggers.warn(`Progress bar '${name}' already exists.`);
            return null;
        }

        let spinner_id = v4();
        let spinner_data = {
            startTime: Date.now(),
            total,
            value: 0,
            name,
            id: spinner_id,
        }

        this.spinners.add(spinner_id, this.task_logs(spinner_data));
        this.bars.set(name, spinner_data);

        return {
            increment: () => {
                this.update(name, 1);
            },
            update: (amount) => {
                this.updateTo(name, amount);
            },
            total: (newTotal) => {
                if(newTotal) {
                    this.setTotal(name, newTotal);
                }

                return this.bars.get(name)?.total || newTotal || 0;
            },
            stop: (fail: boolean = false) => {
                return this.stop(name, fail)
            },
        }
    }

    has(name: string) {
        return this.bars.has(name);
    }

    start() {
        //this.renderAll();
        this.startRenderLoop();
    }

    update(name: string, amount: number = 1): void {
        const bar = this.bars.get(name);
        if (bar) {
            bar.value += amount;
            if (bar.value > bar.total) bar.value = bar.total;
        }
        //this.renderAll();
    }

    updateTo(name: string, value: number): void {
        const bar = this.bars.get(name);
        if (bar) {
            bar.value = value;
            if (bar.value > bar.total) bar.value = bar.total;
        }
        //this.renderAll()
    }

    setTotal(name: string, total: number): void {
        const bar = this.bars.get(name);
        if (bar) bar.total = total;
        //this.renderAll()
    }

    stop(name: string, fail: boolean = false): void {
        let spinner_data = this.bars.get(name);

        if(spinner_data) {
            this.spinners.update(spinner_data.id, this.task_logs(spinner_data, 1, fail));
            this.spinners.succeed(spinner_data.id);
        };

        this.bars.delete(name);
    }

    stopAll(fail: boolean = false): void {
        for (const bar_key of this.bars.keys()) {
            let bar = this.bars.get(bar_key);
            if(!bar) continue;

            if(bar) {
                this.spinners.update(bar.id, this.task_logs(bar, 1, fail));
                this.spinners.succeed(bar.id)
            };
        }

        this.bars.clear();
    }

    private renderAll(): void {
        for (const bar of this.bars.values()) {
            const percent = bar.total ? bar.value / bar.total : 0;
            const elapsed = Date.now() - bar.startTime;
            const eta = bar.value > 0 ? elapsed / bar.value * (bar.total - bar.value) : 0;
            const barStr = renderBar(percent);
            const line = `|${chalk.cyan(barStr)}| ${(percent * 100).toFixed(1)}% || ETA: ${formatTime(eta)}`;

            this.spinners.update(bar.id, this.task_logs(bar, -1, false, line));

            if(bar.value >= bar.total) {
                this.stop(bar.name);
            }
        }
    }
}

export class Logger {
    private _progress: ProgressReport = new ProgressReport();
  
    constructor() {}
  
    log(msg: string) {
        loggers.log(msg);
    }

    success(msg: string) {
        loggers.success(msg);
    }

    progress() {
        return this._progress;
    }
  
    warn(msg: string) {
        loggers.warn(msg);
    }
  
    error(...msg: string[]) {
        loggers.error(msg.join(" "));
    }
}