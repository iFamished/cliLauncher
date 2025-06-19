import * as fs from 'fs';
import * as path from 'path';
import { LauncherAccounts, LauncherAccount } from '../../../types/launcher';
import { minecraft_dir } from '../../utils/common';
import { AUTH_PROVIDERS, Credentials } from '../../../types/account';
import { logger } from '../launch/handler';
import chalk from 'chalk';
import inquirer from 'inquirer';

const mcDir = minecraft_dir();
const launcherProfilesPath = path.join(mcDir, 'launcher_profiles.json');

export class LauncherAccountManager {
    private filePath: string;
    private data: LauncherAccounts;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { accounts: {} };
        this.load();
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.data = raw.accounts ? raw as LauncherAccounts : { accounts: {} };
            } catch (err) {
                logger.error('Failed to parse launcher_profiles.json:', (err as Error).message);
            }
        } else {
            this.save();
        }
    }

    private save() {
        const fullData = fs.existsSync(this.filePath)
            ? JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
            : {};

        fullData.accounts = this.data.accounts;
        fullData.selectedAccount = this.data.selectedAccount;

        fs.writeFileSync(this.filePath, JSON.stringify(fullData, null, 2));
    }

    addAccount(account: LauncherAccount) {
        this.data.accounts[account.id] = account;
        this.save();
    }

    deleteAccount(id: string) {
        try {
            if (this.data.accounts[id]) {
                delete this.data.accounts[id];

                if (this.data.selectedAccount === id) {
                    this.data.selectedAccount = undefined;
                }

                this.save();
                return true;
            } else return false;
        } catch (_) {
            return false;
        }
    }

    hasAccount(cred: Credentials, provider: string): boolean {
        let all_entries = Object.entries(this.data.accounts).map(([_, account]) => {
            return account;
        });

        return all_entries.find(entry => entry.auth === provider.toLowerCase() && entry.credentials === cred) ? true : false;
    }

    getAccount(id: string): LauncherAccount | null {
        let got = this.data.accounts[id];

        if (got) {
            return got;
        } else {
            logger.error(`Account "${id}" does not exist.`);
            return null
        }
    }

    selectAccount(id: string): LauncherAccount | null {
        let got = this.data.accounts[id];
        
        if (got) {
            this.data.selectedAccount = got.id;
            this.save();

            return got;
        } else {
            logger.error(`Account "${id}" does not exist.`);
            return null;
        }
    }

    listAccounts(): LauncherAccount[] {
        return Object.keys(this.data.accounts).map(key => this.data.accounts[key]);
    }

    getSelectedAccount(): LauncherAccount | undefined {
        return this.data.accounts[this.data.selectedAccount || "no-id"];
    }

    async chooseAccount(): Promise<LauncherAccount | null> {
        const accounts = this.listAccounts();

        if (accounts.length === 0) {
            console.log(chalk.red("❌ No accounts found."));
            return null;
        }

        const grouped: Record<AUTH_PROVIDERS, LauncherAccount[]> = {} as any;
        for (const account of accounts) {
            const provider = account.auth as AUTH_PROVIDERS;
            if (!grouped[provider]) grouped[provider] = [];
            grouped[provider].push(account);
        }

        const choices: Array<inquirer.Separator | { name: string; value: string }> = [];

        for (const [provider, providerAccounts] of Object.entries(grouped)) {
            choices.push(new inquirer.Separator(chalk.bold.cyan(`🔑 ${provider.toUpperCase()}`)));

            for (const acc of providerAccounts) {
                const line = `${chalk.hex('#4ade80')(acc.name)} ${chalk.gray(`(${acc.uuid?.slice(0, 8)}...)`)} - ${chalk.hex('#facc15')(acc.auth || 'No info')}`;
                choices.push({ name: line, value: acc.id });
            }
        }

        const { selectedId } = await inquirer.prompt([
            {
                type: "list",
                name: "selectedId",
                message: chalk.hex("#60a5fa")("🎭 Choose an account to use:"),
                choices,
                loop: false
            }
        ]);

        const selectedAccount = this.selectAccount(selectedId);
        if (selectedAccount) {
            console.log(chalk.green(`✅ Selected account: ${selectedAccount.name}`));
        }

        return selectedAccount;
    }

}

export default LauncherAccountManager;