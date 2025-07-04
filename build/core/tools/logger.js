"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.ProgressReport = void 0;
const chalk_1 = __importDefault(require("chalk"));
const spinnies_1 = __importDefault(require("spinnies"));
const uuid_1 = require("uuid");
const tags = {
    log: chalk_1.default.hex('#00c4cc')('📝 LOG'),
    warn: chalk_1.default.hex('#ffc107')('⚠️ WARN'),
    error: chalk_1.default.hex('#ff4d6d')('❌ ERROR'),
    progress: chalk_1.default.hex('#b388ff')('⏳ PROGRESS'),
    success: chalk_1.default.greenBright('✅ SUCCESS'),
};
const logPrefix = chalk_1.default.hex('#ff80ab').bold('ORIGAMI LOG');
function getTime() {
    return chalk_1.default.gray(`[${new Date().toLocaleTimeString()}]`);
}
function formatMessage(type, msg) {
    return `${getTime()} ${logPrefix}: ${tags[type]}: ${msg}`;
}
let loggers = {
    log: (msg) => console.log(formatMessage('log', msg)),
    warn: (msg) => console.warn(formatMessage('warn', msg)),
    error: (msg) => console.error(formatMessage('error', msg)),
    progress: (msg) => console.log(formatMessage('progress', msg)),
    success: (msg) => console.log(formatMessage('success', msg)),
};
;
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (60 * 1000)) % 60;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const parts = [];
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0)
        parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}
function renderBar(percent, width = 30) {
    const complete = Math.round(percent * width);
    const incomplete = width - complete;
    return '█'.repeat(complete) + '░'.repeat(incomplete);
}
const MAX_VISIBLE_BARS = 7;
class ProgressReport {
    bars = new Map();
    spinners = new spinnies_1.default();
    renderInterval = null;
    visible = new Set();
    hidden = [];
    constructor() { }
    startRenderLoop() {
        if (this.renderInterval)
            return;
        this.renderInterval = setInterval(() => {
            this.renderAll();
            if (this.bars.size === 0)
                this.stopRenderLoop();
        }, 100);
    }
    stopRenderLoop() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }
    task_logs(spinner, prog = 0, fail = false, str = "no logs.") {
        switch (prog) {
            case 0:
                return { text: formatMessage('progress', `Starting Task ${chalk_1.default.yellow(`\`${spinner.name}\``)}`), color: 'white' };
            case 1:
                return { text: formatMessage('progress', `Task ${fail ? chalk_1.default.red(`\`${spinner.name}\``) : chalk_1.default.green(`\`${spinner.name}\``)} ${fail ? 'failed.' : 'has ended successfully!'}`), color: 'white' };
            default:
                return { text: formatMessage('progress', `Task ${chalk_1.default.grey(`\`${spinner.name}\``)}: ${str}`), color: 'white' };
        }
    }
    create(name, total, hideTaskLogs = false) {
        if (this.bars.has(name)) {
            loggers.warn(`Progress bar '${name}' already exists.`);
            return null;
        }
        const spinner_id = (0, uuid_1.v4)();
        const spinner_data = {
            startTime: Date.now(),
            total,
            value: 0,
            name,
            id: spinner_id,
            hideTaskLogs
        };
        this.bars.set(name, spinner_data);
        if (this.visible.size < MAX_VISIBLE_BARS) {
            this.visible.add(name);
            this.spinners.add(spinner_id, this.task_logs(spinner_data));
        }
        else {
            this.hidden.push(name);
        }
        return {
            increment: () => this.update(name, 1),
            update: (amount) => this.updateTo(name, amount),
            total: (newTotal) => {
                if (newTotal)
                    this.setTotal(name, newTotal);
                return this.bars.get(name)?.total || newTotal || 0;
            },
            stop: (fail = false) => this.stop(name, fail),
        };
    }
    has(name) {
        return this.bars.has(name);
    }
    start() {
        this.startRenderLoop();
    }
    update(name, amount = 1) {
        const bar = this.bars.get(name);
        if (bar) {
            bar.value += amount;
            if (bar.value > bar.total)
                bar.value = bar.total;
        }
    }
    updateTo(name, value) {
        const bar = this.bars.get(name);
        if (bar) {
            bar.value = value;
            if (bar.value > bar.total)
                bar.value = bar.total;
        }
    }
    setTotal(name, total) {
        const bar = this.bars.get(name);
        if (bar)
            bar.total = total;
    }
    stop(name, fail = false) {
        const spinner = this.bars.get(name);
        if (!spinner)
            return;
        this.visible.delete(name);
        this.bars.delete(name);
        if (!spinner.hideTaskLogs) {
            this.spinners.update(spinner.id, this.task_logs(spinner, 1, fail));
            this.spinners.succeed(spinner.id);
        }
        else {
            this.spinners.remove(spinner.id); // completely remove from terminal
        }
        const next = this.hidden.shift();
        if (next) {
            const nextBar = this.bars.get(next);
            if (nextBar) {
                this.spinners.add(nextBar.id, this.task_logs(nextBar));
                this.visible.add(next);
            }
        }
    }
    stopAll(fail = false) {
        for (const name of [...this.bars.keys()]) {
            this.stop(name, fail);
        }
    }
    renderAll() {
        for (const name of this.visible) {
            const bar = this.bars.get(name);
            if (!bar || bar.value >= bar.total)
                continue;
            if (bar.value >= bar.total) {
                this.stop(name);
                continue;
            }
            const percent = bar.total ? bar.value / bar.total : 0;
            const elapsed = Date.now() - bar.startTime;
            const eta = bar.value > 0 ? elapsed / bar.value * (bar.total - bar.value) : 0;
            const barStr = renderBar(percent);
            const line = `|${chalk_1.default.cyan(barStr)}| ${(percent * 100).toFixed(1)}% || ETA: ${formatTime(eta)}`;
            this.spinners.update(bar.id, this.task_logs(bar, -1, false, line));
        }
        const completed = [...this.visible].filter(name => {
            const bar = this.bars.get(name);
            return bar && bar.value >= bar.total;
        });
        for (const name of completed) {
            this.stop(name);
        }
    }
}
exports.ProgressReport = ProgressReport;
class Logger {
    _progress = new ProgressReport();
    constructor() { }
    log(msg) {
        loggers.log(msg);
    }
    success(msg) {
        loggers.success(msg);
    }
    progress() {
        return this._progress;
    }
    warn(msg) {
        loggers.warn(msg);
    }
    error(...msg) {
        loggers.error(msg.join(" "));
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map