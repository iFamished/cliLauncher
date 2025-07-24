import { spawn } from 'child_process';
import fs from "fs";
import chalk from "chalk";
import temurin from "../../java";
import { minecraft_dir } from '../utils/common';

async function run(jarPath: string, args: string[] = []): Promise<number> {
    if (!fs.existsSync(jarPath)) {
        console.error(`🚫 JAR not found: ${jarPath}`);
        process.exit(1);
    }

    const javaPath = await temurin.select(false);

    console.log(`🚀 Launching JAR with: ${chalk.cyan(javaPath.version)}\n`);

    return new Promise((resolve, reject) => {
        const javaProcess = spawn(javaPath.path, ['-jar', jarPath, ...args], {
            stdio: 'inherit',
            cwd: minecraft_dir(),
        });

        javaProcess.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`✅ Process exited successfully.`));
                resolve(code);
            } else {
                console.error(chalk.red(`❌ Java process exited with code ${code}`));
                reject(code);
            }
        });

        javaProcess.on('error', (err) => {
            console.error(chalk.red(`💥 Failed to start Java process: ${err.message}`));
            reject(err);
        });
    });
}

export { run };