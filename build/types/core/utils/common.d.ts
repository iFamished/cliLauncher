import { Metadata } from "../../types/launcher";
export declare function ensureDir(dir: string): void;
export declare function cleanDir(dir: string): void;
export declare function moveFileSync(oldPath: string, newPath: string): void;
export declare function localpath(isCache?: boolean): string;
export declare function minecraft_dir(): string;
export declare function printVersion(): any;
export declare function waitForFolder(metadata: Metadata, id: string): Promise<string>;
