import { ClientJar } from '../../../../types/client';
declare function installNeoForgeViaExecutor(): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
        unstable: boolean;
        jvm: string;
    };
    get: typeof installNeoForgeViaExecutor;
};
export default _default;
