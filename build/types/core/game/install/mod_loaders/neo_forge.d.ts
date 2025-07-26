import { ClientJar } from '../../../../types/client';
declare function installNeoForgeViaExecutor(version?: string, loader_ver?: string): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installNeoForgeViaExecutor;
};
export default _default;
