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
exports.ensureDir = ensureDir;
exports.cleanDir = cleanDir;
exports.moveFileSync = moveFileSync;
exports.localpath = localpath;
exports.minecraft_dir = minecraft_dir;
exports.printVersion = printVersion;
const fs_1 = __importStar(require("fs"));
const envs_1 = __importDefault(require("../tools/envs"));
const path_1 = __importDefault(require("path"));
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function cleanDir(dir) {
    if (fs_1.default.existsSync(dir)) {
        fs_1.default.rmSync(dir, { recursive: true, force: true });
    }
}
function moveFileSync(oldPath, newPath) {
    (0, fs_1.copyFileSync)(oldPath, newPath);
    (0, fs_1.unlinkSync)(oldPath);
}
function localpath(isCache = false) {
    return isCache ? (0, envs_1.default)('Origami-Cache').temp : (0, envs_1.default)('Origami-Data').data;
}
;
function minecraft_dir() {
    let mc = (0, envs_1.default)('.minecraft').config;
    ensureDir(mc);
    ensureDir(path_1.default.join(mc, "versions"));
    return mc;
}
;
function printVersion() {
    let package_json = path_1.default.join(__dirname, '..', '..', '..', 'package.json');
    if (fs_1.default.existsSync(package_json)) {
        const { version } = JSON.parse(fs_1.default.readFileSync(package_json, { encoding: "utf-8" }));
        return version;
    }
    else {
        return "LATEST";
    }
}
//# sourceMappingURL=common.js.map