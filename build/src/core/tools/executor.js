"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const temurin_1 = __importDefault(require("../tools/temurin"));
async function run(jarPath, args = []) {
    if (!fs_1.default.existsSync(jarPath)) {
        console.error(`🚫 JAR not found: ${jarPath}`);
        process.exit(1);
    }
    const javaPath = await temurin_1.default.select();
    console.log(`🚀 Launching JAR with: ${chalk_1.default.cyan(javaPath.version)}\n`);
    return new Promise((resolve, reject) => {
        const javaProcess = (0, child_process_1.spawn)(javaPath.path, ['-jar', jarPath, ...args], {
            stdio: 'inherit',
            cwd: path_1.default.dirname(jarPath)
        });
        javaProcess.on('close', (code) => {
            if (code === 0) {
                console.log(chalk_1.default.green(`✅ Process exited successfully.`));
                resolve(code);
            }
            else {
                console.error(chalk_1.default.red(`❌ Java process exited with code ${code}`));
                reject(code);
            }
        });
        javaProcess.on('error', (err) => {
            console.error(chalk_1.default.red(`💥 Failed to start Java process: ${err.message}`));
            reject(err);
        });
    });
}
//# sourceMappingURL=executor.js.map