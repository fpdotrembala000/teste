import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePlaylistAI, AnthropicError } from "@/lib/anthropic";

// Adds more songs to an existing playlist (or replaces removed ones).
const schema = z.object({
  prompt: z.string().min(3),
  options: z.object({
    count: z.number().int().min(5).max(100),
    language: z.enum(["qualquer", "portugues", "ingles", "espanhol", "misto"]),
    popularity: z.enum(["famosas", "menos_conhecidas", "misto"]),
    energy: z.enum(["qualquer", "calma", "media", "alta", "intensa"]),
    discoveryMode: z.boolean(),
    safeMode: z.boolean(),
  }),
  keepExisting: z.array(z.object({ title: z.string(), artist: z.string() })),
  avoid: z.array(z.object({ title: z.string(), artist: z.string() })).default([]),
  addCount: z.number().int().min(1).max(50).default(10),
  tweak: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }
    const { prompt, options, keepExisting, avoid, addCount, tweak } = parsed.data;
    const result = await generatePlaylistAI({
      prompt,
      options,
      keepExisting,
      avoid,
      addCount,
      tweak,
    });
    // Filter out songs that are already present (defensive).
    const existing = new Set(
      keepExisting.map((s) => `${s.title}|${s.artist}`.toLowerCase())
    );
    result.songs = result.songs.filter(
      (s) => !existing.has(`${s.title}|${s.artist}`.toLowerCase())
    );
    return NextResponse.json({ playlist: result });
  } catch (e) {
    if (e instanceof AnthropicError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
