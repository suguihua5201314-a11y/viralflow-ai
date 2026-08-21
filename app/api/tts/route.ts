const VOLC_TTS_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts";
const MAX_TEXT_LENGTH = 5_000;
const REQUEST_TIMEOUT_MS = 60_000;

type VoiceStudioPayload = {
  text?: unknown;
  language?: unknown;
  speaker?: unknown;
  speed?: unknown;
  instruction?: unknown;
  emotion?: unknown;
  segmented?: unknown;
  smartPause?: unknown;
  introStyle?: unknown;
  bodyStyle?: unknown;
  outroStyle?: unknown;
};

type VolcTtsResponse = {
  code?: number;
  message?: string;
  data?: string;
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function normalizeSpeed(value: unknown) {
  const speed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(speed) ? Math.min(2, Math.max(0.5, speed)) : 1;
}

function buildVolcRequest(
  payload: VoiceStudioPayload,
  appId: string,
  apiKey: string,
) {
  const languageMap: Record<string, string> = {
    zh: "zh-cn",
    en: "en",
    es: "es",
    it: "it",
    de: "de",
    fr: "fr",
    pt: "pt-br",
  };
  const language =
    typeof payload.language === "string"
      ? languageMap[payload.language]
      : undefined;

  return {
    app: {
      appid: appId,
      token: apiKey,
      cluster: "volcano_mega",
    },
    user: {
      uid: crypto.randomUUID(),
    },
    audio: {
      voice_type: String(payload.speaker),
      encoding: "mp3",
      speed_ratio: normalizeSpeed(payload.speed),
      volume_ratio: 1,
      pitch_ratio: 1,
      ...(language ? { language } : {}),
    },
    request: {
      reqid: crypto.randomUUID(),
      text: String(payload.text).trim(),
      text_type: "plain",
      operation: "query",
    },
  };
}

export async function POST(request: Request) {
  let payload: VoiceStudioPayload;

  try {
    payload = (await request.json()) as VoiceStudioPayload;
  } catch {
    return jsonError("请求内容不是有效的 JSON", 400);
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const speaker =
    typeof payload.speaker === "string" ? payload.speaker.trim() : "";

  if (!text) return jsonError("请输入需要配音的文本", 400);
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(`单次配音文本不能超过 ${MAX_TEXT_LENGTH} 个字符`, 413);
  }
  if (!speaker) return jsonError("请选择配音音色", 400);

  const appId = process.env.VOLC_TTS_APP_ID?.trim();
  const apiKey = process.env.VOLC_TTS_API_KEY?.trim();

  if (!appId || !apiKey) {
    return jsonError(
      "豆包配音尚未配置：请添加 VOLC_TTS_APP_ID 和 VOLC_TTS_API_KEY",
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(VOLC_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer; ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildVolcRequest({ ...payload, text, speaker }, appId, apiKey),
      ),
      signal: controller.signal,
    });

    const result = (await upstream.json().catch(() => null)) as
      | VolcTtsResponse
      | null;

    if (!upstream.ok || result?.code !== 3000 || !result.data) {
      const message = result?.message?.trim();
      return jsonError(
        message ? `豆包配音失败：${message}` : "豆包配音服务暂时不可用",
        upstream.ok ? 502 : upstream.status,
      );
    }

    let audio: Uint8Array;
    try {
      audio = decodeBase64(result.data);
    } catch {
      return jsonError("豆包配音返回了无效的音频数据", 502);
    }

    return new Response(Uint8Array.from(audio).buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="doubao-tts.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("豆包配音请求超时，请稍后重试", 504);
    }
    return jsonError("无法连接豆包配音服务，请稍后重试", 502);
  } finally {
    clearTimeout(timeout);
  }
}
