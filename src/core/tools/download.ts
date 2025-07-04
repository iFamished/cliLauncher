import axios from "axios";
import fs from "fs";
import { ORIGAMi_USER_AGENT } from "../../config/defaults";
import { logger } from "../game/launch/handler";
import path from "path";

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

        const total = parseInt(response.headers['content-length'] || '1', 10);

        download_progress?.total(total);
        progress_manager.start();

        let downloaded = 0;

        response.data.on('data', (chunk: Buffer) => {
            downloaded += chunk.length;
            if (total) {
                download_progress?.update(downloaded);
            } else {
                download_progress?.total(downloaded);
                download_progress?.update(downloaded);
            }
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        download_progress?.stop();
    } catch (error: any) {
        logger.error((error as Error).message);
        download_progress?.stop(true);
    }
}