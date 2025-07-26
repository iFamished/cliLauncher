import { ClientJar } from '../../../../types/client';
export declare function installFabricViaExecutor(version?: string, loader_ver?: string): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installFabricViaExecutor;
};
export default _default;
