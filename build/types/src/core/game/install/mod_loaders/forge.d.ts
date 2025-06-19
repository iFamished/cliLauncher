import { ClientJar } from '../../../../types/client';
declare function installForgeViaExecutor(): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installForgeViaExecutor;
};
export default _default;
