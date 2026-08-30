import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { VideosService } from './videos.service.js';
import { StorageService } from '../storage/storage.service.js';
import { VIDEO_ENCODE_QUEUE } from './queue-names.js';
import { encodeToHls, probeVideo } from './ffmpeg.util.js';

interface EncodeJobData {
  videoId: string;
  sourceKey: string;
}

// 1 day, not "immutable" — the same HLS key path can technically be
// overwritten by a future re-encode of the same video, so this isn't
// content-addressed the way a hash-named asset would be. A CDN in front
// of storage uses this to serve views from the edge instead of hitting
// origin on every playback.
const HLS_CACHE_CONTROL = 'public, max-age=86400';

// The real transcode pipeline: download the raw upload, run FFmpeg to
// produce HLS, upload the output, and publish — all driven by files on
// disk in a scratch directory that's always cleaned up.
@Processor(VIDEO_ENCODE_QUEUE)
export class EncodeProcessor extends WorkerHost {
  private readonly logger = new Logger(EncodeProcessor.name);

  constructor(
    private readonly videosService: VideosService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<EncodeJobData>): Promise<void> {
    const { videoId, sourceKey } = job.data;
    const workDir = await mkdtemp(path.join(tmpdir(), `fliq-encode-${videoId}-`));

    try {
      const sourceExtension = path.extname(sourceKey) || '.mp4';
      const sourcePath = path.join(workDir, `source${sourceExtension}`);
      const sourceBuffer = await this.storage.download(sourceKey);
      await writeFile(sourcePath, sourceBuffer);

      const probe = await probeVideo(sourcePath);
      const { playlistPath, segmentPaths } = await encodeToHls(sourcePath, workDir);

      const hlsPrefix = `videos/${videoId}/hls`;
      const playlistKey = `${hlsPrefix}/index.m3u8`;
      await this.storage.upload(
        playlistKey,
        await readFile(playlistPath),
        'application/vnd.apple.mpegurl',
        HLS_CACHE_CONTROL,
      );
      for (const segmentPath of segmentPaths) {
        const segmentKey = `${hlsPrefix}/${path.basename(segmentPath)}`;
        await this.storage.upload(segmentKey, await readFile(segmentPath), 'video/mp2t', HLS_CACHE_CONTROL);
      }

      await this.videosService.finalizeEncodedVideo(videoId, {
        videoUrl: this.storage.getPublicUrl(playlistKey),
        durationMs: probe.durationMs,
        width: probe.width,
        height: probe.height,
      });
    } catch (err) {
      this.logger.error(`Encode failed for video ${videoId}`, err instanceof Error ? err.stack : err);
      await this.videosService.markEncodeFailed(videoId);
      throw err;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}
