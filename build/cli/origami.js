#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForLatestVersion = checkForLatestVersion;
const commander_1 = require("commander");
const runtime_1 = require("../core/game/launch/runtime");
const common_1 = require("../core/utils/common");
const compare_versions_1 = __importDefault(require("compare-versions"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const account_1 = require("../core/game/account");
const node_fetch_1 = __importDefault(require("node-fetch"));
const java_1 = __importDefault(require("../java"));
const install_1 = require("../core/game/install/packs/install");
const handler_1 = require("../core/game/launch/handler");
const program = new commander_1.Command();
const runtime = new runtime_1.Runtime();
program
    .name('origami')
    .description('✨ Lightweight Minecraft CLI Launcher')
    .version(runtime.version);
program
    .command('menu')
    .description('Start the full interactive menu UI')
    .action(() => {
    runtime.start();
});
program
    .command('modrinth')
    .description('Install mods, shaders, and resource packs from Modrinth')
    .action(async () => {
    const profile = runtime.handler.profiles.getSelectedProfile();
    if (!profile) {
        console.log(chalk_1.default.red('❌ No profile selected.'));
        process.exit(1);
    }
    const installer = new install_1.ModInstaller(handler_1.logger);
    await installer.install_modrinth_content(profile);
    process.exit(0);
});
program
    .command('java')
    .description('Download or select a Temurin JDK')
    .option('-i, --install', 'Download and install a Temurin JDK')
    .option('-s, --select', 'Choose and set the current JDK')
    .option('-d, --delete', 'Delete installed Java')
    .action(async (options) => {
    if (options.install && options.select) {
        console.error('❌ Please choose either --install or --select, not both.');
        process.exit(1);
    }
    try {
        if (options.install) {
            await java_1.default.download();
        }
        else if (options.select) {
            const java = await java_1.default.select(true);
            console.log('✅ Java set to:', java.version, java.path);
        }
        else if (options.delete) {
            await java_1.default.delete();
        }
        else {
            program.commands.find(c => c.name() === 'java').help();
        }
    }
    catch (err) {
        console.error('😿', err.message);
        process.exit(1);
    }
});
program
    .command('manage')
    .description('Manage installed mods, shaders, and resource packs')
    .action(async () => {
    const profile = runtime.handler.profiles.getSelectedProfile();
    if (!profile) {
        console.log(chalk_1.default.red('❌ No profile selected.'));
        process.exit(1);
    }
    await runtime['manageInstallationsMenu'](profile);
    process.exit(0);
});
program
    .command('launch')
    .description('Launch Minecraft using current profile')
    .action(async () => {
    await runtime['launch']();
    process.exit(0);
});
function valid_profile(input) {
    const raw = (0, common_1.parse_input)(input);
    if (!(0, common_1.valid_string)(raw)) {
        throw new Error('❌ Invalid profile format: Must be a non-empty string.');
    }
    const list = runtime.handler.profiles.listProfiles();
    if (!list.includes(raw)) {
        throw new Error(`❌ Profile "${raw}" not found.\n\nTip: Run "origami profile --list" to see all profiles.`);
    }
    return raw;
}
;
program
    .command('profile')
    .description('Open Minecraft Profile Manager')
    .option('-s, --select <profile>', 'Select a specific profile', valid_profile)
    .option('-d, --delete', 'Opens the Profile Deletion Menu')
    .option('-i, --install', 'Install a version')
    .option('-l, --list', 'List all profiles')
    .action(async (options) => {
    const hasOptions = Object.keys(options).length > 0;
    if (!hasOptions) {
        await runtime['handler'].choose_profile();
    }
    if (options.install) {
        await runtime.handler.install_version();
    }
    if (options.delete) {
        await runtime.handler.delete_profile();
    }
    if (options.list) {
        const profiles = runtime.handler.profiles.listProfiles();
        if (!profiles.length) {
            console.log('⚠️  No profiles found.');
        }
        else {
            console.log('📂 Available profiles:\n');
            for (const name of profiles) {
                console.log(`  - ${name}`);
            }
        }
        process.exit(0);
    }
    if (options.select) {
        const selected = options.select;
        runtime.handler.profiles.selectProfile(selected);
        console.log(`✅ Profile set to: ${selected}`);
        process.exit(0);
    }
    process.exit(1);
});
program
    .command('auth')
    .description('Open Minecraft Authenticator')
    .option('-l, --login <provider>', 'Login to a provider (e.g. microsoft, littleskin)')
    .option('-r, --remove <account>', 'Remove a specific account')
    .option('-c, --choose', 'Choose an account')
    .action(async (options) => {
    const hasOptions = Object.keys(options).length > 0;
    if (!hasOptions) {
        await runtime['authenticatorMenu']();
    }
    else {
        const handler = runtime['handler'];
        if (options.login) {
            const provider = options.login.trim().toLowerCase();
            if (!Object.keys(account_1.providers).includes(provider)) {
                console.log(chalk_1.default.red(`❌ Invalid auth provider: "${provider}"`));
                console.log('Available providers: microsoft, littleskin, ely_by, meowskin');
                process.exit(1);
            }
            let credentials = { email: '', password: '' };
            if (provider !== 'microsoft') {
                credentials = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'email',
                        message: 'Email or Username:',
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Password:',
                        mask: '*'
                    },
                ]);
            }
            const result = await handler.login(credentials, provider);
            if (result) {
                console.log(chalk_1.default.green(`✅ Logged in as ${result.name}`));
            }
            else {
                console.log(chalk_1.default.redBright('❌ Login failed.'));
            }
        }
        if (options.remove) {
            const id = options.remove.trim();
            const account = await handler.accounts.getAccount(id);
            if (!account) {
                console.log(chalk_1.default.red(`❌ Account with ID "${id}" not found.`));
            }
            else {
                const confirm = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: chalk_1.default.red(`Are you sure you want to remove account "${account.name}" (${id})?`),
                        default: false
                    }
                ]);
                if (confirm.confirm) {
                    const removed = await handler.accounts.deleteAccount(id);
                    if (removed) {
                        console.log(chalk_1.default.green(`🗑️ Removed account "${account.name}" successfully.`));
                    }
                    else {
                        console.log(chalk_1.default.red(`❌ Failed to remove account "${account.name}".`));
                    }
                }
                else {
                    console.log(chalk_1.default.gray('❎ Account removal cancelled.'));
                }
            }
        }
        if (options.choose) {
            await handler.choose_account();
        }
    }
    process.exit(0);
});
program
    .command('clean')
    .description('Reset Origami and/or Minecraft data directories')
    .option('--minecraft', 'Reset the .minecraft directory')
    .option('--origami', 'Reset Origami config/data (e.g. profiles, accounts)')
    .option('--all', 'Reset everything (same as --minecraft + --origami)')
    .action(async (options) => {
    const doMinecraft = options.all || options.minecraft;
    const doOrigami = options.all || options.origami;
    if (!doMinecraft && !doOrigami) {
        console.log(chalk_1.default.red('❌ Please specify what to reset: --minecraft, --origami, or --all'));
        process.exit(1);
    }
    if (doMinecraft) {
        await runtime.resetMinecraft();
    }
    if (doOrigami) {
        await runtime.resetOrigami();
    }
    console.log(chalk_1.default.green('✅ Done!'));
    process.exit(0);
});
async function checkForLatestVersion(currentVersion) {
    const stableURL = 'https://registry.npmjs.org/@origami-minecraft/stable';
    const devURL = 'https://registry.npmjs.org/@origami-minecraft/devbuilds';
    try {
        const [stableRes, devRes] = await Promise.all([
            (0, node_fetch_1.default)(stableURL),
            (0, node_fetch_1.default)(devURL)
        ]);
        if (!stableRes.ok || !devRes.ok)
            return;
        const stableData = await stableRes.json();
        const devData = await devRes.json();
        const latestStable = stableData['dist-tags']?.latest ?? '';
        const latestDev = devData['dist-tags']?.latest ?? devData['dist-tags']?.dev ?? '';
        const isCurrentDev = currentVersion.includes('-dev');
        const cmpStable = compare_versions_1.default.compareVersions(latestStable, currentVersion);
        const cmpDev = compare_versions_1.default.compareVersions(latestDev, currentVersion);
        if (!isCurrentDev && cmpStable > 0) {
            console.log(chalk_1.default.yellow(`⚠️ A new stable version is available: ${latestStable}\nRun:`), chalk_1.default.cyan(`npm install -g @origami-minecraft/stable@${latestStable}`));
        }
        else if (isCurrentDev && cmpStable > 0) {
            console.log(chalk_1.default.yellow(`⚠️ You're on a dev build (${currentVersion}), but a new stable version is available: ${latestStable}\nRun:`), chalk_1.default.cyan(`npm install -g @origami-minecraft/stable@${latestStable}`));
        }
        else if (isCurrentDev && cmpDev > 0) {
            console.log(chalk_1.default.yellow(`⚠️ A new dev build is available: ${latestDev}\nRun:`), chalk_1.default.cyan(`npm install -g @origami-minecraft/devbuilds@${latestDev}`));
        }
    }
    catch {
        // Silent fail
    }
}
checkForLatestVersion(runtime.version).then(() => program.parse(process.argv));
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=origami.js.map