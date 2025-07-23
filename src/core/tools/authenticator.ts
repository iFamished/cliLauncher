import axios from 'axios'
import { v3 as uuidv3 } from 'uuid'
import { ORIGAMI_CLIENT_TOKEN } from '../../config/defaults'

let uuid: string | null = null
let apiUrl = 'https://authserver.mojang.com'

interface AuthResponse {
    access_token: string
    client_token: string
    uuid: string
    name: string
    selected_profile?: any
    user_properties: string
}

interface UserProperty {
    name: string
    value: string
}

export async function getAuth(
    username: string,
    password?: string,
    clientToken: string = ORIGAMI_CLIENT_TOKEN
): Promise<AuthResponse> {
    getUUID(username)

    if (!password) {
        return {
            access_token: uuid!,
            client_token: genClientToken(clientToken, uuid!),
            uuid: uuid!,
            name: username,
            user_properties: '{}'
        }
    }

    try {
        const response = await axios.post(`${apiUrl}/authenticate`, {
            agent: {
                name: 'Minecraft',
                version: 1
            },
            username,
            password,
            clientToken: genClientToken(clientToken, uuid!),
            requestUser: true
        })

        const body = response.data

        if (!body?.selectedProfile) {
            throw new Error('Validation error: No selected profile')
        }

        return {
            access_token: body.accessToken,
            client_token: body.clientToken,
            uuid: body.selectedProfile.id,
            name: body.selectedProfile.name,
            selected_profile: body.selectedProfile,
            user_properties: parseProps(body.user?.properties)
        }
    } catch (err: any) {
        throw new Error(err?.response?.data?.errorMessage || err.message)
    }
}

export async function validate(accessToken: string, clientToken: string): Promise<boolean> {
    try {
        await axios.post(`${apiUrl}/validate`, {
            accessToken,
            clientToken
        })
        return true
    } catch (err: any) {
        throw new Error(err?.response?.data?.errorMessage || err.message)
    }
}

export async function refreshAuth(accessToken: string, clientToken: string): Promise<AuthResponse> {
    try {
        const response = await axios.post(`${apiUrl}/refresh`, {
            accessToken,
            clientToken,
            requestUser: true
        })

        const body = response.data

        if (!body?.selectedProfile) {
            throw new Error('Validation error: No selected profile')
        }

        return {
            access_token: body.accessToken,
            client_token: getUUID(body.selectedProfile.name),
            uuid: body.selectedProfile.id,
            name: body.selectedProfile.name,
            user_properties: parseProps(body.user?.properties)
        }
    } catch (err: any) {
        throw new Error(err?.response?.data?.errorMessage || err.message)
    }
}

export async function invalidate(accessToken: string, clientToken: string): Promise<boolean> {
    try {
        await axios.post(`${apiUrl}/invalidate`, {
            accessToken,
            clientToken
        })
        return true
    } catch (err: any) {
        throw new Error(err?.response?.data?.errorMessage || err.message)
    }
}

export async function signOut(username: string, password: string): Promise<boolean> {
    try {
        await axios.post(`${apiUrl}/signout`, {
            username,
            password
        })
        return true
    } catch (err: any) {
        throw new Error(err?.response?.data?.errorMessage || err.message)
    }
}

export async function checkAuthServer(url: string = apiUrl): Promise<boolean> {
    try {
        const res = await axios.post(`${url}/authenticate`, {
            agent: { name: 'Minecraft', version: 1 },
            username: 'testuser@example.com',
            password: 'invalidpassword',
            clientToken: ORIGAMI_CLIENT_TOKEN,
            requestUser: true
        });

        return false;
    } catch (err: any) {
        const message = err?.response?.data?.error || err?.response?.statusText;

        if (message && typeof message === 'string') {
            return true;
        }

        return false;
    }
}

export function auth_server(url: string): void {
    apiUrl = url
}

function parseProps(array?: UserProperty[]): string {
    if (!array || !Array.isArray(array)) return '{}'

    const newObj: Record<string, string[]> = {}

    for (const entry of array) {
        if (newObj[entry.name]) {
            newObj[entry.name].push(entry.value)
        } else {
            newObj[entry.name] = [entry.value]
        }
    }

    return JSON.stringify(newObj)
}

function getUUID(value: string): string {
    if (!uuid) {
        uuid = uuidv3(value, uuidv3.DNS)
    }
    return uuid
}

function genClientToken(someToken?: string, uuid?: string) {
    return someToken ? someToken+'='+(uuid || getUUID(someToken)) : uuid || getUUID("life_is_good");
}