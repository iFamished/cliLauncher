import { ClientJar } from '../../../types/client';
export declare function installVanillaViaExecutor(version?: string): Promise<ClientJar | null>;
export declare function isMinecraftVersionInstalled(version: string): Boolean;
export declare function installVanillaHelper(version: string): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installVanillaViaExecutor;
};
export default _default;
