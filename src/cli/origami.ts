#!/usr/bin/env node
import { Command } from 'commander';
import { Runtime } from '../core/game/launch/runtime';
import { parse_input, valid_string } from '../core/utils/common';
import compareVersions from 'compare-versions';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Credentials } from '../types/account';
import fetch from 'node-fetch';
import temurin from '../java';
import { ModInstaller } from '../core/game/install/packs/install';
import { logger } from '../core/game/launch/handler';
import { getAuthProviders } from '../core/game/account';
import { createProvider, deleteProvider } from '../core/game/account/auth_types/create';

const program = new Command();
const runtime = new Runtime();

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
            console.log(chalk.red('❌ No profile selected.'));
            process.exit(1);
        }

        const installer = new ModInstaller(logger);
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
                await temurin.download();
            } else if (options.select) {
                const java = await temurin.select(true);
                console.log('✅ Java set to:', java.version, java.path);
            } else if (options.delete) {
                await temurin.delete();
            } else {
                program.commands.find(c => c.name() === 'java')!.help();
            }
        } catch (err: any) {
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
            console.log(chalk.red('❌ No profile selected.'));
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

function valid_profile(input: string | boolean | string[]) {
    const raw = parse_input(input);

    if (!valid_string(raw)) {
        throw new Error('❌ Invalid profile format: Must be a non-empty string.');
    }

    const list = runtime.handler.profiles.listProfiles();
    
    if (!list.includes(raw)) {
        throw new Error(
            `❌ Profile "${raw}" not found.\n\nTip: Run "origami profile --list" to see all profiles.`
        );
    }

    return raw;
};

program
    .command('profile')
    .description('Open Minecraft Profile Manager')
    .option('-s, --select <profile>', 'Select a specific profile', valid_profile)
    .option('-d, --delete', 'Opens the Profile Deletion Menu')
    .option('-i, --install', 'Install a version')
    .option('-l, --list', 'List all profiles')
    .action(async (options) => {
        const hasOptions = Object.keys(options).length > 0;

        if(!hasOptions) {
            await runtime['handler'].choose_profile();
        }

        if(options.install) {
            await runtime.handler.install_version();
        }

        if(options.delete) {
            await runtime.handler.delete_profile();
        }

        if(options.list) {
            const profiles = runtime.handler.profiles.listProfiles();
            if (!profiles.length) {
                console.log('⚠️  No profiles found.');
            } else {
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
    .command('authprovider')
    .description('User added Authentication Provider manager')
    .option('-c, --create', 'Add a Custom Yggdrasil Server')
    .option('-d, --delete', 'Delete a Custom Yggdrasil Server')
    .action(async (options) => {
        const hasOptions = Object.keys(options).length > 0;

        if (!hasOptions) {
            await runtime['authenticatorMenu']();
        } else {

            if (options.create) {
                await createProvider();
            }

            if (options.delete) {
                await deleteProvider();
            }

        }

        process.exit(0);
    });

program
    .command('auth')
    .description('Open Minecraft Authenticator')
    .option('-l, --login <provider>', 'Login to a provider (e.g. microsoft, littleskin)')
    .option('-r, --remove <account>', 'Remove a specific account')
    .option('-c, --choose', 'Choose an account')
    .action(async (options) => {
        const providers = await getAuthProviders();
        const hasOptions = Object.keys(options).length > 0;

        if (!hasOptions) {
            await runtime['authenticatorMenu']();
        } else {
            const handler = runtime['handler'];

            if (options.login) {
                const provider = options.login.trim().toLowerCase();

                if (!Object.keys(providers).includes(provider)) {
                    console.log(chalk.red(`❌ Invalid auth provider: "${provider}"`));
                    console.log(`Available providers: ${Object.keys(providers).join(', ')}`);
                    process.exit(1);
                }

                let credentials: Credentials = { email: '', password: '' };

                if (provider !== 'microsoft') {
                    credentials = await inquirer.prompt([
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
                    console.log(chalk.green(`✅ Logged in as ${result.name}`));
                } else {
                    console.log(chalk.redBright('❌ Login failed.'));
                }
            }

            if (options.remove) {
                const id = options.remove.trim();
                const account = await handler.accounts.getAccount(id);

                if (!account) {
                    console.log(chalk.red(`❌ Account with ID "${id}" not found.`));
                } else {
                    const confirm = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: chalk.red(`Are you sure you want to remove account "${account.name}" (${id})?`),
                            default: false
                        }
                    ]);

                    if (confirm.confirm) {
                        const removed = await handler.accounts.deleteAccount(id);
                        if (removed) {
                            console.log(chalk.green(`🗑️ Removed account "${account.name}" successfully.`));
                        } else {
                            console.log(chalk.red(`❌ Failed to remove account "${account.name}".`));
                        }
                    } else {
                        console.log(chalk.gray('❎ Account removal cancelled.'));
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
            console.log(chalk.red('❌ Please specify what to reset: --minecraft, --origami, or --all'));
            process.exit(1);
        }

        if (doMinecraft) {
            await runtime.resetMinecraft();
        }

        if (doOrigami) {
            await runtime.resetOrigami();
        }

        console.log(chalk.green('✅ Done!'));
        process.exit(0);
    });

export async function checkForLatestVersion(currentVersion: string) {
    const stableURL = 'https://registry.npmjs.org/@origami-minecraft/stable';
    const devURL = 'https://registry.npmjs.org/@origami-minecraft/devbuilds';

    try {
        const [stableRes, devRes] = await Promise.all([
            fetch(stableURL),
            fetch(devURL)
        ]);

        if (!stableRes.ok || !devRes.ok) return;

        const stableData = await stableRes.json();
        const devData = await devRes.json();

        const latestStable = stableData['dist-tags']?.latest ?? '';
        const latestDev = devData['dist-tags']?.latest ?? devData['dist-tags']?.dev ?? '';

        const isCurrentDev = currentVersion.includes('-dev');
        const cmpStable = compareVersions.compareVersions(latestStable, currentVersion);
        const cmpDev = compareVersions.compareVersions(latestDev, currentVersion);

        if (!isCurrentDev && cmpStable > 0) {
            console.log(
                chalk.yellow(`⚠️ A new stable version is available: ${latestStable}\nRun:`),
                chalk.cyan(`npm install -g @origami-minecraft/stable@${latestStable}`)
            );
        } else if (isCurrentDev && cmpStable > 0) {
            console.log(
                chalk.yellow(`⚠️ You're on a dev build (${currentVersion}), but a new stable version is available: ${latestStable}\nRun:`),
                chalk.cyan(`npm install -g @origami-minecraft/stable@${latestStable}`)
            );
        } else if (isCurrentDev && cmpDev > 0) {
            console.log(
                chalk.yellow(`⚠️ A new dev build is available: ${latestDev}\nRun:`),
                chalk.cyan(`npm install -g @origami-minecraft/devbuilds@${latestDev}`)
            );
        }
    } catch {
        // Silent fail
    }
}

checkForLatestVersion(runtime.version).then(() => program.parse(process.argv));

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
