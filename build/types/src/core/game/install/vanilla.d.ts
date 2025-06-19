import { ClientJar } from '../../../types/client';
export declare function installVanillaViaExecutor(): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installVanillaViaExecutor;
};
export default _default;
