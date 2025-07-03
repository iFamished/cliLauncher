import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import crypto from 'crypto';
import keytar from 'keytar';
import { LauncherAccounts, LauncherAccount } from '../../../types/launcher';
import { minecraft_dir } from '../../utils/common';
import { AUTH_PROVIDERS, Credentials } from '../../../types/account';
import { logger } from '../launch/handler';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ORIGAMI_CLIENT_TOKEN } from '../../../config/defaults';

const SERVICE = 'OrigamiLauncher';
const ACCOUNT = 'encryption-key';

const IV_LENGTH = 16;
const HMAC_ALGO = 'sha256';

const mcDir = minecraft_dir(true);
const launcherProfilesPath = path.join(mcDir, 'accounts.dat');

async function getOrGenerateKey(): Promise<Buffer> {
    const stored = await keytar.getPassword(SERVICE, ACCOUNT);

    if (stored) {
        return Buffer.from(stored, 'hex');
    }

    const fingerprint = `${os.hostname()}-${os.arch()}-${os.platform()}-${ORIGAMI_CLIENT_TOKEN}`;
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(fingerprint, salt, 100_000, 32, 'sha256');

    await keytar.setPassword(SERVICE, ACCOUNT, key.toString('hex'));
    return key;
}

function computeHMAC(data: string, key: Buffer): string {
    return crypto.createHmac(HMAC_ALGO, key).update(data).digest('base64');
}

function encryptWithKey(text: string, key: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

function decryptWithKey(text: string, key: Buffer): string {
    const [ivBase64, encrypted] = text.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export class LauncherAccountManager {
    private filePath: string;
    private data: LauncherAccounts;
    private key: Buffer | null = null;

    constructor(filePath: string = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { accounts: {} };
    }

    private async ensureKey() {
        if (!this.key) {
            this.key = await getOrGenerateKey();
        }
    }

    async load() {
        await this.ensureKey();

        if (fs.existsSync(this.filePath)) {
            try {
                const rawContent = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(rawContent);

                const { encrypted, hmac } = parsed;
                const computedHmac = computeHMAC(encrypted, this.key!);

                if (computedHmac !== hmac) throw new Error('HMAC validation failed. Possible tampering.');

                const decrypted = decryptWithKey(encrypted, this.key!);
                const json = JSON.parse(decrypted);

                this.data = json.accounts ? json : { accounts: {} };
            } catch (err) {
                logger.error('⚠️ Failed to load account data:', (err as Error).message);
                this.data = { accounts: {} };
            }
        } else {
            await this.save();
        }
    }

    async save() {
        await this.ensureKey();

        const plaintext = JSON.stringify(this.data);
        const encrypted = encryptWithKey(plaintext, this.key!);
        const hmac = computeHMAC(encrypted, this.key!);

        const final = { encrypted, hmac };
        fs.writeFileSync(this.filePath, JSON.stringify(final, null, 2));
    }

    reset() {
        if (fs.existsSync(this.filePath)) {
            fs.unlinkSync(this.filePath);
        }
    }

    async addAccount(account: LauncherAccount) {
        this.data.accounts[account.id] = account;
        await this.save();
    }

    async deleteAccount(id: string) {
        if (this.data.accounts[id]) {
            delete this.data.accounts[id];
            if (this.data.selectedAccount === id) this.data.selectedAccount = undefined;
            await this.save();
            return true;
        }
        return false;
    }

    hasAccount(cred: Credentials, provider: string): boolean {
        return Object.values(this.data.accounts).some(acc => acc.auth === provider.toLowerCase() && acc.credentials === cred);
    }

    getAccount(id: string): LauncherAccount | null {
        const acc = this.data.accounts[id];
        if (!acc) {
            logger.error(`Account "${id}" does not exist.`);
            return null;
        }
        return acc;
    }

    async selectAccount(id: string): Promise<LauncherAccount | null> {
        const acc = this.getAccount(id);
        if (!acc) return null;

        this.data.selectedAccount = acc.id;
        await this.save();
        return acc;
    }

    listAccounts(): LauncherAccount[] {
        return Object.values(this.data.accounts);
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

        const selectedAccount = await this.selectAccount(selectedId);
        if (selectedAccount) {
            console.log(chalk.green(`✅ Selected account: ${selectedAccount.name}`));
        }

        return selectedAccount;
    }
}

export default LauncherAccountManager;
