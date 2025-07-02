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
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("../../utils/common");
const handler_1 = require("../launch/handler");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const crypto_1 = __importDefault(require("crypto"));
const defaults_1 = require("../../../config/defaults");
const ENCRYPTION_KEY = crypto_1.default.createHash('sha256').update(defaults_1.ORIGAMI_CLIENT_TOKEN).digest();
const IV_LENGTH = 16;
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}
function decrypt(text) {
    const [ivBase64, encrypted] = text.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
const mcDir = (0, common_1.minecraft_dir)(true);
const launcherProfilesPath = path.join(mcDir, 'accounts.dat');
class LauncherAccountManager {
    filePath;
    data;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { accounts: {} };
        this.load();
    }
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const encrypted = fs.readFileSync(this.filePath, 'utf-8');
                const raw = JSON.parse(decrypt(encrypted));
                this.data = raw.accounts ? raw : { accounts: {} };
            }
            catch (err) {
                handler_1.logger.error('⚠️ Failed to decrypt or parse account data:', err.message);
                this.data = { accounts: {} };
            }
        }
        else {
            this.save();
        }
    }
    save() {
        const encrypted = encrypt(JSON.stringify(this.data));
        fs.writeFileSync(this.filePath, encrypted);
    }
    reset() {
        fs.unlinkSync(this.filePath);
    }
    addAccount(account) {
        this.data.accounts[account.id] = account;
        this.save();
    }
    deleteAccount(id) {
        try {
            if (this.data.accounts[id]) {
                delete this.data.accounts[id];
                if (this.data.selectedAccount === id) {
                    this.data.selectedAccount = undefined;
                }
                this.save();
                return true;
            }
            else
                return false;
        }
        catch (_) {
            return false;
        }
    }
    hasAccount(cred, provider) {
        let all_entries = Object.entries(this.data.accounts).map(([_, account]) => {
            return account;
        });
        return all_entries.find(entry => entry.auth === provider.toLowerCase() && entry.credentials === cred) ? true : false;
    }
    getAccount(id) {
        let got = this.data.accounts[id];
        if (got) {
            return got;
        }
        else {
            handler_1.logger.error(`Account "${id}" does not exist.`);
            return null;
        }
    }
    selectAccount(id) {
        let got = this.data.accounts[id];
        if (got) {
            this.data.selectedAccount = got.id;
            this.save();
            return got;
        }
        else {
            handler_1.logger.error(`Account "${id}" does not exist.`);
            return null;
        }
    }
    listAccounts() {
        return Object.keys(this.data.accounts).map(key => this.data.accounts[key]);
    }
    getSelectedAccount() {
        return this.data.accounts[this.data.selectedAccount || "no-id"];
    }
    async chooseAccount() {
        const accounts = this.listAccounts();
        if (accounts.length === 0) {
            console.log(chalk_1.default.red("❌ No accounts found."));
            return null;
        }
        const grouped = {};
        for (const account of accounts) {
            const provider = account.auth;
            if (!grouped[provider])
                grouped[provider] = [];
            grouped[provider].push(account);
        }
        const choices = [];
        for (const [provider, providerAccounts] of Object.entries(grouped)) {
            choices.push(new inquirer_1.default.Separator(chalk_1.default.bold.cyan(`🔑 ${provider.toUpperCase()}`)));
            for (const acc of providerAccounts) {
                const line = `${chalk_1.default.hex('#4ade80')(acc.name)} ${chalk_1.default.gray(`(${acc.uuid?.slice(0, 8)}...)`)} - ${chalk_1.default.hex('#facc15')(acc.auth || 'No info')}`;
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
        const selectedAccount = this.selectAccount(selectedId);
        if (selectedAccount) {
            console.log(chalk_1.default.green(`✅ Selected account: ${selectedAccount.name}`));
        }
        return selectedAccount;
    }
}
exports.LauncherAccountManager = LauncherAccountManager;
exports.default = LauncherAccountManager;
//# sourceMappingURL=account.js.map