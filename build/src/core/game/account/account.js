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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LauncherAccountManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("../../utils/common");
const mcDir = (0, common_1.minecraft_dir)();
const launcherProfilesPath = path.join(mcDir, 'launcher_profiles.json');
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
                const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                this.data = raw.accounts ? raw : { accounts: {} };
            }
            catch (err) {
                console.error('Failed to parse launcher_profiles.json:', err);
            }
        }
        else {
            this.save();
        }
    }
    save() {
        const fullData = fs.existsSync(this.filePath)
            ? JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
            : {};
        fullData.accounts = this.data.accounts;
        fullData.selectedAccount = this.data.selectedAccount;
        fs.writeFileSync(this.filePath, JSON.stringify(fullData, null, 2));
    }
    addAccount(account) {
        this.data.accounts[account.id] = account;
        this.save();
    }
    deleteAccount(id) {
        if (this.data.accounts[id]) {
            delete this.data.accounts[id];
            if (this.data.selectedAccount === id) {
                this.data.selectedAccount = undefined;
            }
            this.save();
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
            console.warn(`Account "${id}" does not exist.`);
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
            console.warn(`Account "${id}" does not exist.`);
            return null;
        }
    }
    listAccounts() {
        return Object.keys(this.data.accounts).map(key => this.data.accounts[key]);
    }
    getSelectedAccount() {
        return this.data.accounts[this.data.selectedAccount || "no-id"];
    }
}
exports.LauncherAccountManager = LauncherAccountManager;
exports.default = LauncherAccountManager;
//# sourceMappingURL=account.js.map