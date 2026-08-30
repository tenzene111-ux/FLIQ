import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  durationMs: number;
  width: number;
  height: number;
}

// Reads real duration/dimensions from the actual file via ffprobe, instead
// of trusting whatever the upload client claims those values are.
export async function probeVideo(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height:format=duration',
    '-of',
    'json',
    filePath,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number }[];
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream.height || !parsed.format?.duration) {
    throw new Error('Could not read video dimensions/duration — is this a valid video file?');
  }
  return {
    width: stream.width,
    height: stream.height,
    durationMs: Math.round(parseFloat(parsed.format.duration) * 1000),
  };
}

// Single-rendition HLS (capped at 720p tall, never upscaled). A real
// adaptive-bitrate ladder (multiple renditions) is a future enhancement —
// this proves the real transcode pipeline end-to-end first.
export async function encodeToHls(inputPath: string, outputDir: string): Promise<{ playlistPath: string; segmentPaths: string[] }> {
  const playlistPath = path.join(outputDir, 'index.m3u8');
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    inputPath,
    '-vf',
    "scale=-2:'min(720,ih)'",
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-f',
    'hls',
    '-hls_time',
    '6',
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    path.join(outputDir, 'segment_%03d.ts'),
    playlistPath,
  ]);

  const files = await readdir(outputDir);
  const segmentPaths = files.filter((f) => f.endsWith('.ts')).sort().map((f) => path.join(outputDir, f));
  return { playlistPath, segmentPaths };
}
