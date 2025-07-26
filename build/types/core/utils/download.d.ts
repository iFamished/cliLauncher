import http from "http";
import https from "https";
import EventEmitter from "events";
export declare function _temp_safe(): string;
export declare function parallelDownloader(url: string, outputPath: string, totalSize: number, agent?: http.Agent | https.Agent, emitter?: EventEmitter, type?: string): Promise<void>;
export declare function downloader(url: string, outputPath: string): Promise<void>;
export declare function downloadAsync(url: string, targetPath: string, retry?: boolean, type?: string, maxRetries?: number, agent?: http.Agent | https.Agent, emitter?: EventEmitter): Promise<boolean | {
    failed: boolean;
    asset: string | null;
}>;
