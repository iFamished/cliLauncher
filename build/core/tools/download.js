"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloader = downloader;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const defaults_1 = require("../../config/defaults");
const handler_1 = require("../game/launch/handler");
async function downloader(url, outputPath) {
    const progress_manager = handler_1.logger.progress();
    const download_progress = progress_manager.create(`Download`, 1);
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
        const total = parseInt(response.headers['content-length'] || '1', 10);
        download_progress?.total(total);
        progress_manager.start();
        let downloaded = 0;
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
        const writer = fs_1.default.createWriteStream(outputPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        download_progress?.stop();
    }
    catch (error) {
        handler_1.logger.error(error.message);
        download_progress?.stop(true);
    }
}
//# sourceMappingURL=download.js.map