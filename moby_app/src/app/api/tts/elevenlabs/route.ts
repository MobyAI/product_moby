import { NextResponse } from "next/server";
import { fetchTTSBlob } from "@/lib/elevenlabs/textToSpeech";
import type { TTSRequestV3 } from "@/types/elevenlabs";
import { withAuth } from "@/lib/api/withAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(req: any) {
  try {
    const body: TTSRequestV3 = await req.json();

    const {
      text,
      voiceId,
      voiceSettings,
      languageCode,
      seed,
      applyTextNormalization,
      outputFormat,
    } = body;

    // Validate required parameters
    if (!text || !voiceId) {
      return NextResponse.json(
        { error: "Missing required parameters: text and voiceId are required" },
        { status: 400 }
      );
    }

    // v3 has a 10,000 character limit
    if (text.length > 10000) {
      return NextResponse.json(
        {
          error: `Text exceeds maximum character limit of 10,000 for v3 model (current: ${text.length})`,
        },
        { status: 400 }
      );
    }

    // Validate voice settings if provided
    if (voiceSettings) {
      const { stability, similarityBoost, style } = voiceSettings;

      if (stability !== undefined && (stability < 0 || stability > 1)) {
        return NextResponse.json(
          { error: "stability must be between 0 and 1" },
          { status: 400 }
        );
      }

      if (
        similarityBoost !== undefined &&
        (similarityBoost < 0 || similarityBoost > 1)
      ) {
        return NextResponse.json(
          { error: "similarityBoost must be between 0 and 1" },
          { status: 400 }
        );
      }

      if (style !== undefined && (style < 0 || style > 1)) {
        return NextResponse.json(
          { error: "style must be between 0 and 1" },
          { status: 400 }
        );
      }
    }

    // Validate language code if provided (basic ISO 639-1 check)
    if (languageCode && !/^[a-z]{2,3}$/i.test(languageCode)) {
      return NextResponse.json(
        {
          error:
            'Invalid language code. Use ISO 639-1 format (e.g., "en", "fr", "de")',
        },
        { status: 400 }
      );
    }

    // Validate text normalization option
    if (
      applyTextNormalization &&
      !["auto", "on", "off"].includes(applyTextNormalization)
    ) {
      return NextResponse.json(
        { error: 'applyTextNormalization must be "auto", "on", or "off"' },
        { status: 400 }
      );
    }

    // Log the request for debugging (remove in production or use proper logging)
    console.log("TTS v3 Request:", {
      textLength: text.length,
      voiceId,
      hasVoiceSettings: !!voiceSettings,
      languageCode,
      seed,
      applyTextNormalization,
    });

    // Call the ElevenLabs API with v3 model
    const blob = await fetchTTSBlob({
      text,
      voiceId,
      modelId: "eleven_v3", // Always use v3
      voiceSettings,
      languageCode,
      seed,
      applyTextNormalization,
      outputFormat,
    });

    // Convert blob to array buffer for response
    const arrayBuffer = await blob.arrayBuffer();

    // Determine content type based on output format
    const contentType = outputFormat?.startsWith("pcm")
      ? "audio/pcm"
      : "audio/mpeg";

    // Return the audio response
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="tts.${
          outputFormat?.startsWith("pcm") ? "pcm" : "mp3"
        }"`,
        "Cache-Control": "no-cache",
        "X-Model-Used": "eleven_v3",
      },
    });
  } catch (err) {
    console.error("TTS v3 API error:", err);

    if (err instanceof Error) {
      if (err.message.includes("quota") || err.message.includes("limit")) {
        return NextResponse.json(
          {
            error: "API quota exceeded. Please check your ElevenLabs account.",
          },
          { status: 429 }
        );
      }

      if (err.message.includes("voice") || err.message.includes("Voice")) {
        return NextResponse.json(
          { error: "Invalid voice ID or voice not found." },
          { status: 404 }
        );
      }

      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "Failed to generate speech. Please try again." },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
