import { elevenLabsConfigured, synthesizeSpeech } from "@/lib/integrations/elevenlabs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: elevenLabsConfigured(),
    provider: elevenLabsConfigured() ? "elevenlabs" : "browser",
  });
}

export async function POST(req: NextRequest) {
  if (!elevenLabsConfigured()) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured. Set ELEVENLABS_API_KEY.", fallback: "browser" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech(text);
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Hearth-Voice": "elevenlabs",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "TTS failed.",
        fallback: "browser",
      },
      { status: 502 },
    );
  }
}
