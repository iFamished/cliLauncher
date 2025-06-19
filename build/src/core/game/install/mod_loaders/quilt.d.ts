import { ClientJar } from '../../../../types/client';
export declare function installQuiltViaExecutor(): Promise<ClientJar | null>;
declare const _default: {
    metadata: {
        name: string;
        description: string;
        author: string;
    };
    get: typeof installQuiltViaExecutor;
};
export default _default;
