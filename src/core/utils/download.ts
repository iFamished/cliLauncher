import axios from "axios";
import fs from "fs-extra";
import { ORIGAMi_USER_AGENT } from "../../config/defaults";
import { logger } from "../game/launch/handler";
import path from "path";
import http from "http";
import https from "https";
import EventEmitter from "events";
import { v4 as uuid } from "uuid";
import { ensureDir, localpath } from "./common";
import { rename } from "fs/promises";
import LauncherOptionsManager from "../game/launch/options";
import pLimit from "p-limit";

const CHUNK_SIZE = 1024 * 1024 * 5;
const MIN_SIZE_FOR_PARALLEL = 1024 * 1024 * 10;
const TEMP_PREFIX = '.origami.temp-';

export function _temp_safe(): string {
    const temp_folder = path.join(localpath(true), 'download_cache');
    ensureDir(temp_folder);

    const MAX_AGE_MS = 1000 * 60 * 60;

    fs.readdirSync(temp_folder).forEach(file => {
        if (file.startsWith(TEMP_PREFIX)) {
            const filePath = path.join(temp_folder, file);
            try {
                const stats = fs.statSync(filePath);
                const age = Date.now() - stats.mtimeMs;

                if (age > MAX_AGE_MS) {
                    fs.unlinkSync(filePath);
                }
            } catch (err) {
                logger.warn?.(`[TEMP CLEANUP]: Could not clean ${filePath}: ${(err as Error).message}`);
            }
        }
    });


    const temp_file = `${TEMP_PREFIX}${uuid()}`;
    return path.join(temp_folder, temp_file);
}

export async function parallelDownloader(
    url: string,
    outputPath: string,
    totalSize: number,
    agent?: http.Agent | https.Agent,
    emitter?: EventEmitter,
    type = "Download"
): Promise<void> {
    const tempDir = path.join(localpath(true), "download_cache");
    ensureDir(tempDir);

    const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
    const limit = pLimit(new LauncherOptionsManager().getFixedOptions().connections);
    const tempFiles: { index: number; path: string }[] = [];

    let downloadedBytes = 0;

    const downloadChunk = async (index: number, start: number, end: number) => {
        const tempFilePath = path.join(tempDir, `${TEMP_PREFIX}filechunk${index}-${uuid()}`);
        tempFiles.push({ index, path: tempFilePath });

        const response = await axios({
            url,
            method: "GET",
            responseType: "stream",
            headers: {
                Range: `bytes=${start}-${end}`,
                "User-Agent": ORIGAMi_USER_AGENT,
            },
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 400,
        });

        if (response.status !== 206 && chunkCount > 1) {
            throw new Error(`Expected 206 Partial Content, got ${response.status}`);
        }

        let downloadedChunkBytes = 0;

        const writer = fs.createWriteStream(tempFilePath);

        response.data.on("data", (chunk: Buffer) => {
            downloadedChunkBytes += chunk.length;
            downloadedBytes += chunk.length;
            emitter?.emit("download-status", {
                name: path.basename(outputPath),
                type,
                current: downloadedBytes,
                total: totalSize,
            });
        });

        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
    };

    const tasks = Array.from({ length: chunkCount }, (_, index) => {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
        return () => limit(() => downloadChunk(index, start, end));
    });

    await Promise.all(tasks.map(task => task()));

    tempFiles.sort((a, b) => a.index - b.index);

    const finalWriter = fs.createWriteStream(outputPath);
    for (const { path: tempFile } of tempFiles) {
        await fs.appendFile(outputPath, await fs.readFile(tempFile));
        await fs.remove(tempFile);
    }
    finalWriter.end();

    await new Promise<void>((resolve, reject) => {
        finalWriter.on("finish", resolve);
        finalWriter.on("error", reject);
    });
}

export async function downloader(url: string, outputPath: string): Promise<void> {
    const progress_manager = logger.progress();
    const download_progress = progress_manager.create(path.basename(outputPath), 1);

    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            maxRedirects: 5,
            headers: {
                'User-Agent': ORIGAMi_USER_AGENT,
            }
        });

        const headResp = await axios.head(url, {
            headers: { 'User-Agent': ORIGAMi_USER_AGENT },
            maxRedirects: 5
        });

        const total = parseInt(headResp.headers['content-length'] || '1', 10);
        const acceptsRanges = headResp.headers['accept-ranges'] === 'bytes';

        download_progress?.total(total);
        progress_manager.start();

        let downloaded = 0;

        if (acceptsRanges && total >= MIN_SIZE_FOR_PARALLEL) {
            download_progress?.total(total);
            progress_manager.start();

            await parallelDownloader(
                url,
                outputPath,
                total,
                undefined,
                {
                    emit: (event, payload) => {
                        if (event === "download-status" && payload?.current && payload?.total) {
                            download_progress?.total(payload.total);
                            download_progress?.update(payload.current);
                        }
                    }
                } as EventEmitter,
                "Parallel"
            );

            download_progress?.stop();
            return;
        }

        response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            if (total) {
                download_progress?.update(downloaded);
            } else {
                download_progress?.total(downloaded);
                download_progress?.update(downloaded);
            }
        });

        const temp_safe = _temp_safe();

        const writer = fs.createWriteStream(temp_safe);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            async function _resolve(...args: any[]) {
                await new Promise(res => setTimeout(res, 100));

                let dir = path.dirname(outputPath);
                ensureDir(dir);

                await rename(temp_safe, outputPath);
                await new Promise(res => setTimeout(res, 100));
                resolve(...args);
            }

            async function _reject(...args: any[]) {
                await new Promise(res => setTimeout(res, 100));
                reject(...args);
            }

            writer.on('finish', _resolve);
            writer.on('error', _reject);
        });

        download_progress?.stop();
    } catch (error: any) {
        logger.error((error as Error).message);
        download_progress?.stop(true);
    }
}

export async function downloadAsync(
    url: string,
    targetPath: string,
    retry = true,
    type = "Download",
    maxRetries = 2,
    agent?: http.Agent | https.Agent,
    emitter?: EventEmitter
): Promise<boolean | { failed: boolean; asset: string | null }> {
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            const response = await axios({
                url,
                method: "GET",
                responseType: "stream",
                headers: {
                    "User-Agent": ORIGAMi_USER_AGENT,
                },
                httpAgent: agent,
                httpsAgent: agent,
                timeout: 50000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                validateStatus: (status) => status < 400
            });

            const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
            const temp_safe = _temp_safe();
            let receivedBytes = 0;

            await new Promise<void>((resolve, reject) => {
                const fileStream = fs.createWriteStream(temp_safe);

                response.data.on("data", (chunk: Buffer) => {
                    receivedBytes += chunk.length;
                    emitter?.emit("download-status", {
                        name: path.basename(targetPath),
                        type,
                        current: receivedBytes,
                        total: totalBytes,
                    });
                });

                response.data.pipe(fileStream);

                fileStream.on("finish", async() => {
                    await new Promise(res => setTimeout(res, 100));

                    let dir = path.dirname(targetPath);
                    ensureDir(dir);

                    await rename(temp_safe, targetPath);

                    emitter?.emit("download", targetPath);
                    resolve();
                });

                fileStream.on("error", (err) => {
                    reject(err);
                });

                response.data.on("error", (err: any) => {
                    reject(err);
                });
            });

            return true;
        } catch (err: any) {
            emitter?.emit("debug", `[DOWNLOADER]: Failed to download ${url} to ${targetPath}:\n${err.message}`);
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
            attempt++;

            if (attempt > maxRetries || !retry) {
                return { failed: true, asset: null };
            }

            const wait = 500 * Math.pow(2, attempt - 1);
            emitter?.emit("debug", `[DOWNLOADER]: Retrying download (${attempt}/${maxRetries}) after ${wait}ms...`);
            await new Promise(res => setTimeout(res, wait));
        }
    }

    return { failed: true, asset: null };
}