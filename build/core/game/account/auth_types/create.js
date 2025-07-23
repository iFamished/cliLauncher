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
exports.createProvider = createProvider;
exports.deleteProvider = deleteProvider;
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
const authenticator_1 = require("../../../tools/authenticator");
const fs_extra_1 = require("fs-extra");
const __1 = require("..");
function toClassName(name) {
    return (name
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join("") + "Auth");
}
async function validateServerUrl(input) {
    try {
        const url = new url_1.URL(input);
        if (input.endsWith("/"))
            return "URL must not end with a slash";
        const res = await axios_1.default.get(input, { timeout: 5000 });
        if (res.status >= 400)
            return `Server responded with HTTP ${res.status}`;
        return true;
    }
    catch (err) {
        return `❌ Failed to reach server: ${err.message}`;
    }
}
async function validateAuthEndpoint(base, endpoint) {
    if (!endpoint.startsWith("/") || endpoint.endsWith("/")) {
        return "Endpoint must not end with and must start with '/'";
    }
    const fullUrl = `${base}${endpoint}`;
    try {
        const res = await (0, authenticator_1.checkAuthServer)(fullUrl);
        if (!res)
            return `Endpoint responded with HTTP 404 or It has invalid JSON-structure!`;
        return true;
    }
    catch (err) {
        return `❌ Failed to reach endpoint: ${err.message}`;
    }
}
async function createProvider() {
    const { yggdrasilName } = await inquirer_1.default.prompt([
        {
            type: "input",
            name: "yggdrasilName",
            message: "Enter YGGDRASIL_NAME (e.g., Littleskin):",
            validate: input => input.trim() !== "" || "Name cannot be empty",
        }
    ]);
    let yggdrasilServer;
    while (true) {
        const { input } = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "input",
                message: "Enter YGGDRASIL_SERVER (must be a valid base URL, no trailing slash):"
            }
        ]);
        const valid = await validateServerUrl(input);
        if (valid === true) {
            yggdrasilServer = input;
            break;
        }
        else {
            console.log(valid);
        }
    }
    let authEndpoint;
    while (true) {
        const { input } = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "input",
                message: "Enter AUTHSERVER endpoint (e.g., /authserver — no slashes at end - MUST BE CORRECT AS THIS IS WHERE AUTHENTICATION HAPPENS):",
                default: '/authserver'
            }
        ]);
        const valid = await validateAuthEndpoint(yggdrasilServer, input);
        if (valid === true) {
            authEndpoint = input;
            break;
        }
        else {
            console.log(valid);
        }
    }
    const className = toClassName(yggdrasilName);
    const targetFolder = path_1.default.join(__dirname, 'usermade');
    if (!(await (0, fs_extra_1.pathExists)(targetFolder)))
        fs_1.default.mkdirSync(targetFolder, { recursive: true });
    const targetPath = path_1.default.join(targetFolder, `${className}.js`);
    const ely_by = path_1.default.join(__dirname, 'premade', 'ely_by.js');
    const template = fs_1.default.readFileSync(ely_by, "utf-8");
    const finalCode = template
        .replace(`name: 'Ely.by',`, `name: '${yggdrasilName}',`)
        .replace(`server = 'https://authserver.ely.by';`, `server = '${yggdrasilServer}';`)
        .replace(`Authenticator.auth_server(this.server + "/auth")`, `Authenticator.auth_server("${yggdrasilServer + authEndpoint}")`)
        .replace(`base: 'Mojang'`, `base: 'Custom'`);
    fs_1.default.writeFileSync(targetPath, finalCode);
    console.log(`✅ Provider '${className}' created at ${targetPath}`);
}
async function deleteProvider() {
    const usermadeDir = path_1.default.join(__dirname, "usermade");
    if (!fs_1.default.existsSync(usermadeDir)) {
        console.error("❌ No 'usermade' directory found.");
        return;
    }
    const files = fs_1.default.readdirSync(usermadeDir).filter(file => file.endsWith(".js"));
    if (files.length === 0) {
        console.log("⚠️ No usermade providers to delete.");
        return;
    }
    const { selected } = await inquirer_1.default.prompt([
        {
            type: "checkbox",
            name: "selected",
            message: "Select provider(s) to delete:",
            choices: files
        }
    ]);
    if (selected.length === 0) {
        console.log("❎ No providers selected. Nothing was deleted.");
        return;
    }
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to delete ${selected.length} provider(s)?`,
            default: false
        }
    ]);
    if (confirm) {
        for (const file of selected) {
            const filePath = path_1.default.join(usermadeDir, file);
            try {
                const module = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
                const ProviderClass = module.default;
                if (!ProviderClass) {
                    console.warn(`⚠️ Could not load class from '${file}'`);
                }
                else {
                    const instance = new ProviderClass('', '');
                    const metadataName = instance.metadata?.name;
                    if (metadataName && __1.authRegistry.has(metadataName)) {
                        __1.authRegistry.delete(metadataName);
                        console.log(`🧹 Removed '${metadataName}' from registry`);
                    }
                    else {
                        console.warn(`⚠️ Could not find '${file}' in registry`);
                    }
                }
            }
            catch (err) {
                console.warn(`⚠️ Error loading '${file}': ${err.message}`);
            }
            fs_1.default.unlinkSync(filePath);
            console.log(`🗑️ Deleted '${file}'`);
        }
    }
    else {
        console.log("❎ Deletion cancelled.");
    }
}
//# sourceMappingURL=create.js.map