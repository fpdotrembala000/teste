import { NextRequest, NextResponse } from "next/server";
import { generatePlaylistAI, AnthropicError } from "@/lib/anthropic";
import { generatePlaylistRequestSchema } from "@/lib/validators";

// Generates a playlist (just the AI part, no Spotify yet).
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = generatePlaylistRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { prompt, count, language, popularity, energy, discoveryMode, safeMode, avoid, tweak } =
      parsed.data;

    const playlist = await generatePlaylistAI({
      prompt,
      options: { count, language, popularity, energy, discoveryMode, safeMode },
      avoid,
      tweak,
    });

    return NextResponse.json({ playlist });
  } catch (e) {
    if (e instanceof AnthropicError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
