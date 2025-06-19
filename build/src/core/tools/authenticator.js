"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = getAuth;
exports.validate = validate;
exports.refreshAuth = refreshAuth;
exports.invalidate = invalidate;
exports.signOut = signOut;
exports.auth_server = auth_server;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const defaults_1 = require("../../config/defaults");
let uuid = null;
let apiUrl = 'https://authserver.mojang.com';
async function getAuth(username, password, clientToken = defaults_1.ORIGAMI_CLIENT_TOKEN) {
    getUUID(username);
    if (!password) {
        return {
            access_token: uuid,
            client_token: genClientToken(clientToken, uuid),
            uuid: uuid,
            name: username,
            user_properties: '{}'
        };
    }
    try {
        const response = await axios_1.default.post(`${apiUrl}/authenticate`, {
            agent: {
                name: 'Minecraft',
                version: 1
            },
            username,
            password,
            clientToken: genClientToken(clientToken, uuid),
            requestUser: true
        });
        const body = response.data;
        if (!body?.selectedProfile) {
            throw new Error('Validation error: No selected profile');
        }
        return {
            access_token: body.accessToken,
            client_token: body.clientToken,
            uuid: body.selectedProfile.id,
            name: body.selectedProfile.name,
            selected_profile: body.selectedProfile,
            user_properties: parseProps(body.user?.properties)
        };
    }
    catch (err) {
        throw new Error(err?.response?.data?.errorMessage || err.message);
    }
}
async function validate(accessToken, clientToken) {
    try {
        await axios_1.default.post(`${apiUrl}/validate`, {
            accessToken,
            clientToken
        });
        return true;
    }
    catch (err) {
        throw new Error(err?.response?.data?.errorMessage || err.message);
    }
}
async function refreshAuth(accessToken, clientToken) {
    try {
        const response = await axios_1.default.post(`${apiUrl}/refresh`, {
            accessToken,
            clientToken,
            requestUser: true
        });
        const body = response.data;
        if (!body?.selectedProfile) {
            throw new Error('Validation error: No selected profile');
        }
        return {
            access_token: body.accessToken,
            client_token: getUUID(body.selectedProfile.name),
            uuid: body.selectedProfile.id,
            name: body.selectedProfile.name,
            user_properties: parseProps(body.user?.properties)
        };
    }
    catch (err) {
        throw new Error(err?.response?.data?.errorMessage || err.message);
    }
}
async function invalidate(accessToken, clientToken) {
    try {
        await axios_1.default.post(`${apiUrl}/invalidate`, {
            accessToken,
            clientToken
        });
        return true;
    }
    catch (err) {
        throw new Error(err?.response?.data?.errorMessage || err.message);
    }
}
async function signOut(username, password) {
    try {
        await axios_1.default.post(`${apiUrl}/signout`, {
            username,
            password
        });
        return true;
    }
    catch (err) {
        throw new Error(err?.response?.data?.errorMessage || err.message);
    }
}
function auth_server(url) {
    apiUrl = url;
}
function parseProps(array) {
    if (!array || !Array.isArray(array))
        return '{}';
    const newObj = {};
    for (const entry of array) {
        if (newObj[entry.name]) {
            newObj[entry.name].push(entry.value);
        }
        else {
            newObj[entry.name] = [entry.value];
        }
    }
    return JSON.stringify(newObj);
}
function getUUID(value) {
    if (!uuid) {
        uuid = (0, uuid_1.v3)(value, uuid_1.v3.DNS);
    }
    return uuid;
}
function genClientToken(someToken, uuid) {
    return someToken ? someToken + '=' + (uuid || getUUID(someToken)) : uuid || getUUID("life_is_good");
}
//# sourceMappingURL=authenticator.js.map