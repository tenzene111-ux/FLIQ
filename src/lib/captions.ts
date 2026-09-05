export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  segments?: WhisperSegment[];
}

/**
 * Real speech-to-text via OpenAI's Whisper API. Returns null (never fake
 * segments) when OPENAI_API_KEY isn't set or the call fails for any reason —
 * callers should just skip storing captions in that case.
 */
export async function generateCaptions(buffer: Buffer, filename: string, contentType: string): Promise<CaptionSegment[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;

    const data: WhisperResponse = await res.json();
    if (!Array.isArray(data.segments)) return null;

    const segments = data.segments
      .map((s) => ({ start: s.start, end: s.end, text: String(s.text || "").trim() }))
      .filter((s) => s.text.length > 0);
    return segments.length > 0 ? segments : null;
  } catch {
    return null;
  }
}
