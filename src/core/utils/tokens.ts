import { Auth, Minecraft } from 'msmc';
import { MclcUser, MCToken } from 'msmc/types/types';

type MinecraftLikeToken = {
    mcToken: string;
    refresh?: string;
    exp?: number;
    profile: {
        id: string;
        name: string;
    };
    xuid?: string;
};

function validate(token: Partial<MinecraftLikeToken>): boolean {
    return typeof token.exp === 'number' && token.exp > Date.now();
}

function toMinecraftLikeToken(token: MCToken | Minecraft | MclcUser): MinecraftLikeToken {
    if ('mcToken' in token && 'profile' in token) {
        if (!token.profile || !token.profile.id || !token.profile.name)
            throw new Error("Invalid Minecraft profile");

        return {
            mcToken: token.mcToken,
            refresh: typeof token.refresh === 'string' ? token.refresh : undefined,
            exp: token.exp,
            profile: {
                id: token.profile.id,
                name: token.profile.name,
            },
        };
    } else if ('access_token' in token && 'meta' in token && 'uuid' in token && 'name' in token) {
        if (!token.uuid || !token.name) throw new Error("Missing uuid or name in MclcUser");

        return {
            mcToken: token.access_token,
            refresh: token.meta?.refresh,
            exp: token.meta?.exp,
            profile: {
                id: token.uuid,
                name: token.name,
            },
            xuid: token.meta?.xuid,
        };
    } else {
        throw new Error("Unsupported token format");
    }
}

function fromToken(
    auth: Auth,
    rawToken: MCToken | Minecraft | MclcUser,
    refresh?: boolean
): Promise<Minecraft> | Minecraft {
    const token = toMinecraftLikeToken(rawToken);

    if (validate(token) && refresh) {
        if (!token.refresh) throw new Error("Missing refresh token");

        return new Promise(async (resolve, reject) => {
            try {
                const xbl = await auth.refresh(token.refresh!);
                const mc = await xbl.getMinecraft();
                resolve(mc);
            } catch (e) {
                reject(e);
            }
        });
    }

    if (!token.mcToken || !token.profile?.id || !token.profile?.name) {
        throw new Error("Token missing required fields");
    }

    return new Minecraft(token.mcToken, token.profile, auth, token.refresh!, token.exp!);
}

export function fromMclcToken(
    auth: Auth,
    token: MclcUser,
    refresh?: boolean
): Promise<Minecraft> | Minecraft {
    return fromToken(auth, token, refresh);
}
