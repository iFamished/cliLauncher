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
exports.LauncherProfileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("../utils/common");
const mcDir = (0, common_1.minecraft_dir)();
const launcherProfilesPath = path.join(mcDir, 'launcher_profiles.json');
class LauncherProfileManager {
    filePath;
    data;
    constructor(filePath = launcherProfilesPath) {
        this.filePath = filePath;
        this.data = { profiles: {} };
        this.load();
    }
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
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
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }
    addProfile(id, versionId, name, icon) {
        const now = new Date().toISOString();
        const profile = {
            name: name ?? id,
            type: 'custom',
            created: now,
            lastUsed: now,
            lastVersionId: versionId,
            icon: icon ?? 'Furnace'
        };
        this.data.profiles[id] = profile;
        this.save();
    }
    deleteProfile(id) {
        if (this.data.profiles[id]) {
            delete this.data.profiles[id];
            if (this.data.selectedProfile === id) {
                this.data.selectedProfile = undefined;
            }
            this.save();
        }
    }
    selectProfile(id) {
        if (this.data.profiles[id]) {
            this.data.selectedProfile = id;
            this.data.profiles[id].lastUsed = new Date().toISOString();
            this.save();
        }
        else {
            console.warn(`Profile "${id}" does not exist.`);
        }
    }
    listProfiles() {
        return Object.keys(this.data.profiles);
    }
    getProfile(id) {
        return this.data.profiles[id];
    }
    getSelectedProfile() {
        return this.data.selectedProfile;
    }
}
exports.LauncherProfileManager = LauncherProfileManager;
exports.default = LauncherProfileManager;
//# sourceMappingURL=launcher.js.map