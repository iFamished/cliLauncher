"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._temp_safe = _temp_safe;
exports.parallelDownloader = parallelDownloader;
exports.downloader = downloader;
exports.downloadAsync = downloadAsync;
const axios_1 = __importDefault(require("axios"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const defaults_1 = require("../../config/defaults");
const handler_1 = require("../game/launch/handler");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const common_1 = require("./common");
const promises_1 = require("fs/promises");
const options_1 = __importDefault(require("../game/launch/options"));
const p_limit_1 = __importDefault(require("p-limit"));
const CHUNK_SIZE = 1024 * 1024 * 5;
const MIN_SIZE_FOR_PARALLEL = 1024 * 1024 * 10;
const TEMP_PREFIX = '.origami.temp-';
function _temp_safe() {
    const temp_folder = path_1.default.join((0, common_1.localpath)(true), 'download_cache');
    (0, common_1.ensureDir)(temp_folder);
    const MAX_AGE_MS = 1000 * 60 * 60;
    fs_extra_1.default.readdirSync(temp_folder).forEach(file => {
        if (file.startsWith(TEMP_PREFIX)) {
            const filePath = path_1.default.join(temp_folder, file);
            try {
                const stats = fs_extra_1.default.statSync(filePath);
                const age = Date.now() - stats.mtimeMs;
                if (age > MAX_AGE_MS) {
                    fs_extra_1.default.unlinkSync(filePath);
                }
            }
            catch (err) {
                handler_1.logger.warn?.(`[TEMP CLEANUP]: Could not clean ${filePath}: ${err.message}`);
            }
        }
    });
    const temp_file = `${TEMP_PREFIX}${(0, uuid_1.v4)()}`;
    return path_1.default.join(temp_folder, temp_file);
}
async function parallelDownloader(url, outputPath, totalSize, agent, emitter, type = "Download") {
    const tempDir = path_1.default.join((0, common_1.localpath)(true), "download_cache");
    (0, common_1.ensureDir)(tempDir);
    const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
    const limit = (0, p_limit_1.default)(new options_1.default().getFixedOptions().connections);
    const tempFiles = [];
    let downloadedBytes = 0;
    const downloadChunk = async (index, start, end) => {
        const tempFilePath = path_1.default.join(tempDir, `${TEMP_PREFIX}filechunk${index}-${(0, uuid_1.v4)()}`);
        tempFiles.push({ index, path: tempFilePath });
        const response = await (0, axios_1.default)({
            url,
            method: "GET",
            responseType: "stream",
            headers: {
                Range: `bytes=${start}-${end}`,
                "User-Agent": defaults_1.ORIGAMi_USER_AGENT,
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
        const writer = fs_extra_1.default.createWriteStream(tempFilePath);
        response.data.on("data", (chunk) => {
            downloadedChunkBytes += chunk.length;
            downloadedBytes += chunk.length;
            emitter?.emit("download-status", {
                name: path_1.default.basename(outputPath),
                type,
                current: downloadedBytes,
                total: totalSize,
            });
        });
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
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
    const finalWriter = fs_extra_1.default.createWriteStream(outputPath);
    for (const { path: tempFile } of tempFiles) {
        await fs_extra_1.default.appendFile(outputPath, await fs_extra_1.default.readFile(tempFile));
        await fs_extra_1.default.remove(tempFile);
    }
    finalWriter.end();
    await new Promise((resolve, reject) => {
        finalWriter.on("finish", resolve);
        finalWriter.on("error", reject);
    });
}
async function downloader(url, outputPath) {
    const progress_manager = handler_1.logger.progress();
    const download_progress = progress_manager.create(path_1.default.basename(outputPath), 1);
    try {
        const response = await (0, axios_1.default)({
            url,
            method: 'GET',
            responseType: 'stream',
            maxRedirects: 5,
            headers: {
                'User-Agent': defaults_1.ORIGAMi_USER_AGENT,
            }
        });
        const headResp = await axios_1.default.head(url, {
            headers: { 'User-Agent': defaults_1.ORIGAMi_USER_AGENT },
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
            await parallelDownloader(url, outputPath, total, undefined, {
                emit: (event, payload) => {
                    if (event === "download-status" && payload?.current && payload?.total) {
                        download_progress?.total(payload.total);
                        download_progress?.update(payload.current);
                    }
                }
            }, "Parallel");
            download_progress?.stop();
            return;
        }
        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            if (total) {
                download_progress?.update(downloaded);
            }
            else {
                download_progress?.total(downloaded);
                download_progress?.update(downloaded);
            }
        });
        const temp_safe = _temp_safe();
        const writer = fs_extra_1.default.createWriteStream(temp_safe);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            async function _resolve(...args) {
                await new Promise(res => setTimeout(res, 100));
                let dir = path_1.default.dirname(outputPath);
                (0, common_1.ensureDir)(dir);
                await (0, promises_1.rename)(temp_safe, outputPath);
                await new Promise(res => setTimeout(res, 100));
                resolve(...args);
            }
            async function _reject(...args) {
                await new Promise(res => setTimeout(res, 100));
                reject(...args);
            }
            writer.on('finish', _resolve);
            writer.on('error', _reject);
        });
        download_progress?.stop();
    }
    catch (error) {
        handler_1.logger.error(error.message);
        download_progress?.stop(true);
    }
}
async function downloadAsync(url, targetPath, retry = true, type = "Download", maxRetries = 2, agent, emitter) {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await (0, axios_1.default)({
                url,
                method: "GET",
                responseType: "stream",
                headers: {
                    "User-Agent": defaults_1.ORIGAMi_USER_AGENT,
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
            await new Promise((resolve, reject) => {
                const fileStream = fs_extra_1.default.createWriteStream(temp_safe);
                response.data.on("data", (chunk) => {
                    receivedBytes += chunk.length;
                    emitter?.emit("download-status", {
                        name: path_1.default.basename(targetPath),
                        type,
                        current: receivedBytes,
                        total: totalBytes,
                    });
                });
                response.data.pipe(fileStream);
                fileStream.on("finish", async () => {
                    await new Promise(res => setTimeout(res, 100));
                    let dir = path_1.default.dirname(targetPath);
                    (0, common_1.ensureDir)(dir);
                    await (0, promises_1.rename)(temp_safe, targetPath);
                    emitter?.emit("download", targetPath);
                    resolve();
                });
                fileStream.on("error", (err) => {
                    reject(err);
                });
                response.data.on("error", (err) => {
                    reject(err);
                });
            });
            return true;
        }
        catch (err) {
            emitter?.emit("debug", `[DOWNLOADER]: Failed to download ${url} to ${targetPath}:\n${err.message}`);
            if (fs_extra_1.default.existsSync(targetPath))
                fs_extra_1.default.unlinkSync(targetPath);
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
//# sourceMappingURL=download.js.map