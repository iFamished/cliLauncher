// runtime.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import * as gradient from 'gradient-string';
import { Handler, logger } from './handler';
import { readFileSync } from 'fs';
import * as data_manager from "../../tools/data_manager";
import path from 'path';
import readline from 'readline';
import { localpath, minecraft_dir } from '../../utils/common';
import { removeSync } from 'fs-extra';
import { checkForLatestVersion } from '../../../cli/origami';
import temurin from '../../../java';
import { ModInstaller } from '../install/packs/install';
import { LauncherProfile } from '../../../types/launcher';
import ModrinthModManager from '../install/packs/manager';
import { getAuthProviders } from '../account';
import MicrosoftAuth from '../account/auth_types/premade/microsoft';
import { createProvider, deleteProvider } from '../account/auth_types/create';
import { Separator } from '@inquirer/prompts';

if (!process.stdin.isTTY) {
    logger.error(`Umm... is this terminal asleep? I can't reach it (no TTY 😢)`);
    process.exit(1);
}

export class Runtime {
    public handler: Handler = new Handler();
    public version: string;

    constructor() {
        this.version = this.getVersion();
    }

    async start(): Promise<void> {
        console.clear();
        await this.showLicenseAgreement();
        
        console.clear();
        await this.showHeader();
        await this.mainMenu();
    }

    private async showLicenseAgreement(): Promise<void> {
        if (this.hasAgreedToLicense()) return;

        const license = this.getLicense();
        const lines = license.licenseText.split('\n');
        const delay = 100; // ms per line

        let skipped = false;
        let skipResolver: () => void;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Listen for key to skip
        const skipPromise = new Promise<void>((resolve) => {
            skipResolver = resolve;
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once('data', () => {
                skipped = true;
                process.stdin.setRawMode(false);
                resolve();
            });
        });

        const animateText = async () => {
            const total = lines.length

            for (let i = 0; i < total; i++) {
                if (skipped) break;
                const line = lines[i];
                const faded = gradient.teen(line);
                console.log(faded);
                await new Promise(res => setTimeout(res, delay));
            }

            skipped = true;
            process.stdin.setRawMode(false);
            skipResolver();

            console.log();
        };

        console.clear();
        console.log(chalk.bold(`📜 License: ${license.name}\n`));
        console.log(chalk.dim('(Press any key to skip license animation...)\n'));

        await Promise.race([animateText(), skipPromise]);
        rl.close();

        if (skipped) {
            console.clear();
            console.log(chalk.bold(`📜 License: ${license.name}\n`));
            console.log(gradient.morning(license.licenseText));
            console.log();

            process.stdin.setRawMode(false);
            process.stdin.pause();

            while (process.stdin.read() !== null) {}

            readline.emitKeypressEvents(process.stdin);

            process.stdin.setRawMode(false);
            process.stdin.resume();
        }

        const { agree, remember } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'agree',
                message: chalk.hex('#4ADE80')('Do you agree to the license terms?'),
                default: false
            },
            {
                type: 'confirm',
                name: 'remember',
                message: 'Only show this once?',
                default: true,
                when: (answers) => answers.agree
            }
        ]);

        if (agree) {
            if (remember) {
                data_manager.set("license:agreed", true);
            }
        } else {
            console.log(chalk.redBright('\n❌ You must agree to the license terms to use Origami.'));
            process.exit(1);
        }
    }

    private getVersion(): string {
        try {
            const pkgPath = path.resolve(__dirname, '../../../../package.json');
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            return pkg.version || 'unknown';
        } catch (_) {
            return 'unknown';
        }
    }

    private getAllLicense(): any {
        try {
            const lcnPath = path.join(__dirname, '../../../../licences.json');
            const lcn = JSON.parse(readFileSync(lcnPath, 'utf-8'));
            return lcn;
        } catch (_) {
            return {};
        }
    }

    private getLicense(): { name: string; licenseText: string; } {
        try {
            const pkgPath = path.join(__dirname, '../../../../package.json');
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            const lcn = pkg.license || 'GPL-3.0-only'
            
            const license = this.getAllLicense()[lcn];

            return license || { name: 'MIT', licenseText: "" };
        } catch (_) {
            return { name: 'MIT', licenseText: "" };
        }
    }

    private hasAgreedToLicense(): boolean {
        return data_manager.get("license:agreed") ? true : false;
    }

    private async showHeader() {
        await checkForLatestVersion(this.version);
        const logo = figlet.textSync('Origami', { font: 'Standard' });
        console.log(gradient.retro(logo));
        console.log(chalk.gray(` ✨ Lightweight Minecraft CLI Launcher — Version ${this.version}`));
        console.log();
    }

    private async authenticatorMenu(): Promise<void> {
        while (true) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: chalk.hex('#60a5fa')('🔐 Authenticator Menu'),
                    choices: [
                        { name: '👤 Choose Account', value: 'choose' },
                        { name: '➕ Login', value: 'login' },
                        { name: '❌ Remove Account', value: 'remove' },
                        new inquirer.Separator(),
                        { name: '🌐 Add a Custom Yggdrasil Server', value: 'create_provider' },
                        { name: '🌐 Delete a Custom Yggdrasil Server', value: 'delete_provider' },
                        new inquirer.Separator(),
                        { name: '🔙 Back to Main Menu', value: 'back' }
                    ],
                    loop: false
                }
            ]);

            console.clear();

            const all_providers = await getAuthProviders();

            switch (choice) {
                case 'choose':
                    await this.handler.choose_account();
                    break;
                
                case 'create_provider':
                    await createProvider();
                    break;

                case 'delete_provider':
                    await deleteProvider();
                    break;

                case 'login':
                    const grouped: Record<string, { name: string; value: string }[]> = {};

                    for (const [prov, providerCtor] of all_providers.entries()) {
                        const metadata = new providerCtor('', '').metadata;

                        if (!grouped[metadata.base]) {
                            grouped[metadata.base] = [];
                        }

                        grouped[metadata.base].push({
                            name: metadata.name,
                            value: prov
                        });
                    }

                    const sortedBases = Object.keys(grouped).sort();
                    const choices: Array<{ name: string; value: string } | Separator> = [];

                    for (const base of sortedBases) {
                        choices.push(new Separator(chalk.bold.cyan(`🔑 ${base}`)));

                        const providers = grouped[base].sort((a, b) => a.name.localeCompare(b.name));
                        choices.push(...providers);
                    }

                    const { provider } = await inquirer.prompt({
                        type: 'list',
                        name: 'provider',
                        message: 'Auth Provider:',
                        choices,
                    });

                    const credentials = provider === "MSA" || provider === 'microsoft' ? { email: "", password: "" } : await inquirer.prompt([
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

                    const result = await this.handler.login(
                        credentials,
                        provider
                    );

                    if (result) {
                        console.log(chalk.green(`✅ Logged in as ${result.name}`));
                    } else {
                        console.log(chalk.redBright('❌ Login failed.'));
                    }

                    await new Promise(res => setTimeout(res, 2000));
                    await this.showHeader();
                    break;

                case 'remove':
                    await this.handler.remove_account();
                    break;

                case 'back':
                    return;
            }

            console.clear();
        }
    }

    private async mainMenu(): Promise<void> {
        while (true) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: chalk.hex('#c084fc')('🌸 What do you want to do?'),
                    choices: [
                        { name: '🎮 Launch Minecraft', value: 'launch' },
                        new inquirer.Separator(),
                        { name: '🔐 Authenticator', value: 'authenticator' },
                        { name: '🛠  Configure Settings', value: 'configure_settings' },
                        new inquirer.Separator(),
                        { name: '📂 All Profiles', value: 'choose_profile' },
                        { name: '⬇️  Install Minecraft Version', value: 'install_version' },
                        { name: '🗑️  Delete Profile/Instance', value: 'delete_profile' },
                        new inquirer.Separator(),
                        { name: '🧩 Install Mods / Resources / Shaders', value: 'install_content' },
                        { name: '🧰 Manage Installations', value: 'manage_installations' },
                        new inquirer.Separator(),
                        { name: '☕ Install Java', value: 'install_java' },
                        { name: '📌 Select Java', value: 'select_java' },
                        { name: '🗑️  Delete Java', value: 'delete_java' },
                        new inquirer.Separator(),
                        { name: '🧹 Reset Minecraft', value: 'reset_minecraft' },
                        { name: '🧹 Reset Origami', value: 'reset_origami' },
                        new inquirer.Separator(),
                        { name: '🚪 Exit', value: 'exit' }
                    ],
                    loop: false,
                }
            ]);

            switch (choice) {
                case 'launch':
                    await this.launch();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'choose_profile':
                    await this.handler.choose_profile();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'delete_profile':
                    await this.handler.delete_profile();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'authenticator':
                    await this.authenticatorMenu();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'configure_settings':
                    await this.handler.configure_settings();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'install_version':
                    await this.handler.install_version();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'install_content':
                    const installer = new ModInstaller(logger);
                    const profile = this.handler.profiles.getSelectedProfile();
                    if (profile) await installer.install_modrinth_content(profile);
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'manage_installations':
                    const _profile = this.handler.profiles.getSelectedProfile();
                    if (_profile) await this.manageInstallationsMenu(_profile);

                    break;
                case 'install_java':
                    await temurin.download();
                    console.log('\n\n\n');

                    break;
                case 'select_java':
                    await temurin.select(true);
                    console.log('\n\n\n');

                    break;
                case 'delete_java':
                    await temurin.delete();
                    console.log('\n\n\n');

                    break;
                case 'reset_minecraft':
                    await this.resetMinecraft();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'reset_origami':
                    await this.resetOrigami();
                    console.log('\n\n\n');
                    await this.showHeader();

                    break;
                case 'exit':
                    this.exit();
                    return;
            }
        }
    }

    public async resetMinecraft(): Promise<void> {
        const mcDir = minecraft_dir();
        
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk.redBright(`⚠️  This will delete everything in: ${mcDir}\nAre you sure?`),
                default: false,
            }
        ]);

        if (!confirm) return;

        try {
            removeSync(mcDir);
            console.log(chalk.green('🧹 Minecraft directory reset successfully.'));
        } catch (err) {
            console.log(chalk.red('❌ Failed to reset Minecraft directory.'));
            console.error(err);
        }

        await new Promise(res => setTimeout(res, 2000));
    }

    public async resetOrigami(): Promise<void> {
        const cache = localpath(true);
        const origami = minecraft_dir(true);
        const data = localpath();
        
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk.redBright(`⚠️  This will delete everything in: ${data} and corresponding Origami settings, accounts and profiles\nAre you sure?`),
                default: false,
            }
        ]);

        if (!confirm) return;

        try {
            removeSync(data);
            removeSync(cache);
            removeSync(origami);

            console.log(chalk.green('🧹 Origami reset successfully.'));
        } catch (err) {
            console.log(chalk.red('❌ Failed to reset Origami'));
            console.error(err);
        }

        await new Promise(res => setTimeout(res, 2000));
    }

    private async launch() {
        const code = await this.handler.run_minecraft();
        if (code === 200) {
            console.log(chalk.green('✅ Minecraft exited successfully!'));
        } else {
            console.log(chalk.red('❌ Failed to launch Minecraft.'));
        }
    }

    private exit() {
        console.log(chalk.gray('\n👋 Thanks for using Origami! Happy crafting!'));
        process.exit(0);
    }

    public async manageInstallationsMenu(profile: LauncherProfile) {
        const manager = new ModrinthModManager(profile);

        while (true) {
            const list = manager.getList();
            const choices = [];

            const addGroup = (title: string, items: string[], type: 'mod' | 'shader' | 'resourcepack') => {
                if (items.length > 0) {
                    choices.push(new inquirer.Separator(`📁 ${title}`));
                    for (const item of items) {
                        const isDisabled = type === 'mod' && manager.isModDisabled(item);
                        choices.push({
                            name: `${item}${isDisabled ? chalk.gray(' (disabled)') : ''}`,
                            value: { name: item, type }
                        });
                    }
                }
            };

            addGroup('Mods', list.mods, 'mod');
            addGroup('Shaders', list.shaders, 'shader');
            addGroup('Resource Packs', list.resourcepacks, 'resourcepack');

            choices.push(new inquirer.Separator());
            choices.push({ name: '🔙 Back', value: '__back' });

            const { selected } = await inquirer.prompt({
                type: 'list',
                name: 'selected',
                message: 'Select an installed item to manage:',
                choices,
                pageSize: 20
            });

            if (selected === '__back') break;

            await this.manageInstalledItem(manager, selected.name, selected.type);
        }
    }

    private async manageInstalledItem(
        manager: ModrinthModManager,
        name: string,
        type: 'mod' | 'shader' | 'resourcepack'
    ) {
        const isDisabled = type === 'mod' ? manager.isModDisabled(name) : false;

        const actions = [
            { name: '🗑 Delete', value: 'delete' }
        ];

        if (type === 'mod') {
            actions.push({
                name: isDisabled ? '✅ Enable' : '🚫 Disable',
                value: isDisabled ? 'enable' : 'disable'
            });
        }

        actions.push({ name: '🔙 Back', value: 'back' });

        const { action } = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: `What do you want to do with "${name}"?`,
            choices: actions
        });

        switch (action) {
            case 'delete':
                manager.deleteFromType(name, type);
                console.log(chalk.redBright(`🗑 Deleted ${name} from ${type}s.`));
                break;

            case 'disable':
                manager.disableMod(name);
                console.log(chalk.yellow(`🚫 Disabled ${name}.`));
                break;

            case 'enable':
                manager.enableMod(name);
                console.log(chalk.green(`✅ Enabled ${name}.`));
                break;

            case 'back':
            default:
                return;
        }

        await new Promise(res => setTimeout(res, 1500));
    }

}

// Run directly if executed standalone
if (require.main === module) {
    const runtime = new Runtime();
    runtime.start();
}
