import * as fs from 'fs';
import * as path from 'path';
import { LauncherAccounts, LauncherAccount } from '../../../types/launcher';
import { minecraft_dir } from '../../utils/common';
import { AUTH_PROVIDERS, Credentials } from '../../../types/account';
import { logger } from '../launch/handler';
import chalk from 'chalk';
import inquirer from 'inquirer';
import crypto from 'crypto';
import { ORIGAMI_CLIENT_TOKEN } from '../../../config/defaults';

const ENCRYPTION_KEY = crypto.createHash('sha256').update(ORIGAMI_CLIENT_TOKEN).digest();
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

export function decrypt(text: string): string {
    const [ivBase64, encrypted] = text.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

const mcDir = minecraft_dir(true);
const launcherProfilesPath = path.join(mcDir, 'accounts.dat');

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
                const encrypted = fs.readFileSync(this.filePath, 'utf-8');
                const raw = JSON.parse(decrypt(encrypted));
                this.data = raw.accounts ? raw : { accounts: {} };
            } catch (err) {
                logger.error('⚠️ Failed to decrypt or parse account data:', (err as Error).message);
                this.data = { accounts: {} };
            }
        } else {
            this.save();
        }
    }

    private save() {
        const encrypted = encrypt(JSON.stringify(this.data));
        fs.writeFileSync(this.filePath, encrypted);
    }

    reset() {
        fs.unlinkSync(this.filePath);
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

        const choices: Array<any | { name: string; value: string }> = [];

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