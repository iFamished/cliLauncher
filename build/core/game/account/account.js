"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LauncherAccountManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto_1 = __importDefault(require("crypto"));
const keytar_1 = __importDefault(require("keytar"));
const common_1 = require("../../utils/common");
const handler_1 = require("../launch/handler");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const defaults_1 = require("../../../config/defaults");
const _1 = require(".");
const SERVICE = 'OrigamiLauncher';
const ACCOUNT = os.userInfo().username;
const IV_LENGTH = 16;
const HMAC_ALGO = 'sha256';
const mcDir = (0, common_1.minecraft_dir)(true);
const launcherProfilesPath = path.join(mcDir, 'accounts.dat');
const old_launcherProfilesPath = path.join(mcDir, 'launcher_profiles.json');
async function getOrGenerateKey() {
    const stored = await keytar_1.default.getPassword(SERVICE, ACCOUNT);
    if (stored) {
        return Buffer.from(stored, 'hex');
    }
    const fingerprint = `${os.hostname()}-${os.arch()}-${os.platform()}-${defaults_1.ORIGAMI_CLIENT_TOKEN}`;
    const salt = crypto_1.default.randomBytes(16);
    const key = crypto_1.default.pbkdf2Sync(fingerprint, salt, 100_000, 32, 'sha256');
    await keytar_1.default.setPassword(SERVICE, ACCOUNT, key.toString('hex'));
    return key;
}
function computeHMAC(data, key) {
    return crypto_1.default.createHmac(HMAC_ALGO, key).update(data).digest('base64');
}
function encryptWithKey(text, key) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}
function decryptWithKey(text, key) {
    const [ivBase64, encrypted] = text.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
async function migrateLegacyFormat(filePath, currentKey) {
    try {
        const old = fs.existsSync(old_launcherProfilesPath) ? fs.readFileSync(old_launcherProfilesPath, 'utf-8') : '{}';
        // Case 1: Plain JSON file (unencrypted)
        try {
            const parsed = JSON.parse(old);
            if (parsed.accounts) {
                handler_1.logger.warn('⚠️ Detected old launcher_profiles accounts. Migrating to encrypted format...');
                const newData = parsed;
                const plaintext = JSON.stringify(newData);
                const encrypted = encryptWithKey(plaintext, currentKey);
                const hmac = computeHMAC(encrypted, currentKey);
                const wrapped = { encrypted, hmac };
                fs.writeFileSync(filePath, JSON.stringify(wrapped, null, 2));
                if (fs.existsSync(old_launcherProfilesPath)) {
                    delete parsed.accounts;
                    fs.writeFileSync(old_launcherProfilesPath, JSON.stringify(parsed, null, 2));
                }
                ;
                return newData;
            }
        }
        catch (_) {
            // Not valid JSON, fall through to next check
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        // Case 1: Plain JSON file (unencrypted)
        try {
            const parsed = JSON.parse(raw);
            if (parsed.accounts) {
                handler_1.logger.warn('⚠️ Detected unencrypted accounts.dat. Migrating to encrypted format...');
                const newData = parsed;
                const plaintext = JSON.stringify(newData);
                const encrypted = encryptWithKey(plaintext, currentKey);
                const hmac = computeHMAC(encrypted, currentKey);
                const wrapped = { encrypted, hmac };
                fs.writeFileSync(filePath, JSON.stringify(wrapped, null, 2));
                return newData;
            }
        }
        catch (_) {
            // Not valid JSON, fall through to next check
        }
        // Case 2: Legacy encrypted format (AES-256-CBC with static ORIGAMI_CLIENT_TOKEN)
        try {
            const legacyKey = crypto_1.default.createHash('sha256').update(defaults_1.ORIGAMI_CLIENT_TOKEN).digest();
            const decrypted = decryptWithKey(raw, legacyKey);
            const parsed = JSON.parse(decrypted);
            if (parsed.accounts) {
                handler_1.logger.warn('⚠️ Detected legacy-encrypted accounts.dat. Migrating to encrypted format...');
                const newData = parsed;
                const plaintext = JSON.stringify(newData);
                const encrypted = encryptWithKey(plaintext, currentKey);
                const hmac = computeHMAC(encrypted, currentKey);
                const wrapped = { encrypted, hmac };
                fs.writeFileSync(filePath, JSON.stringify(wrapped, null, 2));
                return newData;
            }
        }
        catch (_) {
            // Not decryptable with legacy key
        }
        return null;
    }
    catch (err) {
        handler_1.logger.error('❌ Failed to read or migrate legacy accounts.dat:', err.message);
        return null;
    }
}
class LauncherAccountManager {
    filePath;
    data;
    key = null;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { accounts: {} };
        this.load();
    }
    async ensureKey() {
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
                if (!parsed.encrypted || !parsed.hmac) {
                    throw new Error("Not new format");
                }
                const { encrypted, hmac } = parsed;
                const computedHmac = computeHMAC(encrypted, this.key);
                if (computedHmac !== hmac) {
                    throw new Error('HMAC validation failed.');
                }
                const decrypted = decryptWithKey(encrypted, this.key);
                const json = JSON.parse(decrypted);
                if (json.selectedAccount) {
                    this.data.selectedAccount = json.selectedAccount;
                }
                if (json.accounts) {
                    this.data.accounts = json.accounts;
                }
                else {
                    throw new Error("Decrypted JSON does not contain accounts.");
                }
            }
            catch (err) {
                handler_1.logger.warn('⚠️ Encrypted load failed. Attempting migration...');
                const migrated = await migrateLegacyFormat(this.filePath, this.key);
                if (migrated) {
                    this.data = migrated;
                }
                else {
                    handler_1.logger.error('❌ Could not migrate legacy accounts.dat. Starting fresh.');
                    this.data = { accounts: {} };
                }
            }
        }
        else {
            await this.save();
        }
    }
    async save() {
        await this.ensureKey();
        const plaintext = JSON.stringify({ accounts: this.data.accounts, selectedAccount: this.data.selectedAccount });
        const encrypted = encryptWithKey(plaintext, this.key);
        const hmac = computeHMAC(encrypted, this.key);
        const final = { encrypted, hmac };
        fs.writeFileSync(this.filePath, JSON.stringify(final, null, 2));
    }
    reset() {
        if (fs.existsSync(this.filePath)) {
            fs.unlinkSync(this.filePath);
        }
    }
    async addAccount(account) {
        await this.load();
        this.data.accounts[account.id] = account;
        await this.save();
    }
    async deleteAccount(id) {
        await this.load();
        if (this.data.accounts[id]) {
            delete this.data.accounts[id];
            if (this.data.selectedAccount === id)
                this.data.selectedAccount = undefined;
            await this.save();
            return true;
        }
        return false;
    }
    async hasAccount(cred, provider) {
        await this.load();
        return Object.values(this.data.accounts).some(acc => acc.auth.name === provider.toLowerCase() && acc.credentials === cred);
    }
    async getAccount(id) {
        await this.load();
        const acc = this.data.accounts[id];
        if (!acc) {
            handler_1.logger.error(`Account "${id}" does not exist.`);
            return null;
        }
        return acc;
    }
    async selectAccount(id) {
        const acc = await this.getAccount(id);
        if (!acc)
            return null;
        this.data.selectedAccount = acc.id;
        await this.save();
        return acc;
    }
    async listAccounts() {
        await this.load();
        return Object.values(this.data.accounts);
    }
    async getSelectedAccount() {
        await this.load();
        return this.getAccount(this.data.selectedAccount || 'no-id');
    }
    async chooseAccount() {
        const accounts = await this.listAccounts();
        if (accounts.length === 0) {
            console.log(chalk_1.default.red("❌ No accounts found."));
            return null;
        }
        const allProviders = await (0, _1.getAuthProviders)();
        const providerMeta = new Map();
        for (const [key, ctor] of allProviders.entries()) {
            try {
                const meta = new ctor('', '').metadata;
                providerMeta.set(key, meta);
            }
            catch {
                providerMeta.set(key, { name: key, base: "Other" });
            }
        }
        const groupedByBase = {};
        for (const acc of accounts) {
            const authKey = acc.auth;
            const meta = providerMeta.get(authKey.name);
            const base = meta?.base ?? "Other";
            if (!groupedByBase[base])
                groupedByBase[base] = [];
            groupedByBase[base].push(acc);
        }
        const sortedBases = Object.keys(groupedByBase).sort();
        const choices = [];
        for (const base of sortedBases) {
            choices.push(new inquirer_1.default.Separator(chalk_1.default.bold.cyan(`🔑 ${base.toUpperCase()}`)));
            const providerAccounts = groupedByBase[base]
                .sort((a, b) => (a.name || 'other').localeCompare(b.name || 'other'));
            for (const acc of providerAccounts) {
                const line = `${chalk_1.default.hex('#4ade80')(acc.name)} ${chalk_1.default.gray(`(${acc.uuid?.slice(0, 8)}...)`)} - ${chalk_1.default.hex('#facc15')(acc.auth.name || 'No info')}`;
                choices.push({ name: line, value: acc.id });
            }
        }
        const { selectedId } = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "selectedId",
                message: chalk_1.default.hex("#60a5fa")("🎭 Choose an account to use:"),
                choices,
                loop: false
            }
        ]);
        const selectedAccount = await this.selectAccount(selectedId);
        if (selectedAccount) {
            console.log(chalk_1.default.green(`✅ Selected account: ${selectedAccount.name}`));
        }
        return selectedAccount;
    }
}
exports.LauncherAccountManager = LauncherAccountManager;
exports.default = LauncherAccountManager;
//# sourceMappingURL=account.js.map