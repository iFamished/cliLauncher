import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import axios from "axios";
import { URL } from "url";
import { checkAuthServer } from "../../../tools/authenticator";
import { pathExists } from "fs-extra";

function toClassName(name: string) {
    return (
        name
            .replace(/[^a-zA-Z0-9]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join("") + "Auth"
    );
}

async function validateServerUrl(input: string) {
    try {
        const url = new URL(input);
        if (input.endsWith("/")) return "URL must not end with a slash";
        const res = await axios.get(input, { timeout: 5000 });
        if (res.status >= 400) return `Server responded with HTTP ${res.status}`;
        return true;    
    } catch (err: any) {
        return `❌ Failed to reach server: ${err.message}`;
    }
}

async function validateAuthEndpoint(base: string, endpoint: string) {
    if (!endpoint.startsWith("/") || endpoint.endsWith("/")) {
        return "Endpoint must not end with and must start with '/'";
    }
    const fullUrl = `${base}${endpoint}`;
    try {
        const res = await checkAuthServer(fullUrl);
        if (!res) return `Endpoint responded with HTTP 404 or It has invalid JSON-structure!`;
        return true;
    } catch (err: any) {
        return `❌ Failed to reach endpoint: ${err.message}`;
    }
}

export async function createProvider() {
    const { yggdrasilName } = await inquirer.prompt([
        {
            type: "input",
            name: "yggdrasilName",
            message: "Enter YGGDRASIL_NAME (e.g., Littleskin):",
            validate: input => input.trim() !== "" || "Name cannot be empty",
        }
    ]);

    let yggdrasilServer: string;
    while (true) {
        const { input } = await inquirer.prompt([
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
        } else {
            console.log(valid);
        }
    }

    let authEndpoint: string;
    while (true) {
        const { input } = await inquirer.prompt([
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
        } else {
            console.log(valid);
        }
    }

    const className = toClassName(yggdrasilName);
    const targetFolder = path.join(__dirname, 'usermade');

    if(!(await pathExists(targetFolder))) fs.mkdirSync(targetFolder, { recursive: true });

    const targetPath = path.join(targetFolder, `${className}.js`);
    const ely_by = path.join(__dirname, 'premade', 'ely_by.js');

    const template = fs.readFileSync(ely_by, "utf-8");

    const finalCode = template
        .replace(`name: 'Ely.by',`, `name: '${yggdrasilName}',`)
        .replace(`server = 'https://authserver.ely.by';`, `server = '${yggdrasilServer}';`)
        .replace(`Authenticator.auth_server(this.server + "/auth")`, `Authenticator.auth_server("${yggdrasilServer+authEndpoint}")`)
        .replace(`base: 'Mojang'`, `base: 'Custom'`);
    
    fs.writeFileSync(targetPath, finalCode);
    console.log(`✅ Provider '${className}' created at ${targetPath}`);
}

export async function deleteProvider() {
    const usermadeDir = path.join(__dirname, "usermade");

    if (!fs.existsSync(usermadeDir)) {
        console.error("❌ No 'usermade' directory found.");
        return;
    }

    const files = fs.readdirSync(usermadeDir).filter(file => file.endsWith(".js"));

    if (files.length === 0) {
        console.log("⚠️ No usermade providers to delete.");
        return;
    }

    const { selected } = await inquirer.prompt([
        {
            type: "list",
            name: "selected",
            message: "Select a provider to delete:",
            choices: files
        }
    ]);

    const filePath = path.join(usermadeDir, selected);

    const { confirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to delete '${selected}'?`,
            default: false
        }
    ]);

    if (confirm) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Provider '${selected}' deleted.`);
    } else {
        console.log("❎ Deletion cancelled.");
    }
}
