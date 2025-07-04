import { ClientJar } from "./client";
export interface API {
    get: (version: string | undefined) => ClientJar;
    metadata: APIMetadata;
}
export interface APIMetadata {
    name: string;
    author: string;
    description: string;
    unstable?: boolean;
    jvm?: string;
}
