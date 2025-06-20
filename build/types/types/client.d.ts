export interface ClientJar {
    name: string;
    version: string;
    url: string;
    client: ClientDir;
}
export interface ClientDir {
    dir: string;
    jar: string;
}
