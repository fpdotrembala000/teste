import { NextRequest, NextResponse } from "next/server";
import { inspirationRequestSchema } from "@/lib/validators";
import {
  getArtistsByIds,
  getPlaylistMeta,
  getPlaylistTracks,
  getValidAccessToken,
  SpotifyApiError,
  SpotifyAuthError,
} from "@/lib/spotify";
import { decadeOf, extractPlaylistId, uniqueBy } from "@/lib/utils";
import { generatePlaylistAI, AnthropicError } from "@/lib/anthropic";
import type { PlaylistAnalysis } from "@/types";

// Reads 2-3 playlists, analyzes them, and asks the AI for an inspired one.
export async function POST(req: NextRequest) {
  const out = NextResponse.next();
  try {
    const parsed = inspirationRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }
    const { playlistUrls, variation, count, safeMode } = parsed.data;

    const ids = playlistUrls.map((u) => extractPlaylistId(u)).filter(Boolean) as string[];
    if (!ids.length) {
      return NextResponse.json(
        { error: "Não foi possível extrair IDs das playlists informadas" },
        { status: 400 }
      );
    }

    const token = await getValidAccessToken({ res: out });

    // Read all tracks from all playlists.
    const allTracks: Awaited<ReturnType<typeof getPlaylistTracks>> = [];
    const playlistMetas: { name: string; total: number }[] = [];
    for (const id of ids) {
      try {
        const meta = await getPlaylistMeta(id, token);
        const tracks = await getPlaylistTracks(id, token);
        playlistMetas.push({ name: meta.name, total: meta.tracks.total });
        allTracks.push(...tracks);
      } catch (e) {
        if (e instanceof SpotifyApiError && (e.status === 404 || e.status === 403)) {
          return NextResponse.json(
            {
              error: `Playlist inacessível ou inválida: ${id}. Verifique se é pública ou se você tem acesso.`,
            },
            { status: 400 }
          );
        }
        throw e;
      }
    }

    if (!allTracks.length) {
      return NextResponse.json(
        { error: "As playlists informadas estão vazias." },
        { status: 400 }
      );
    }

    // Frequency counts.
    const artistCount = new Map<string, { name: string; count: number; id: string }>();
    const yearCount = new Map<string, number>();
    let explicitCount = 0;
    let popSum = 0;
    let popN = 0;
    for (const t of allTracks) {
      for (const a of t.artists) {
        const cur = artistCount.get(a.id) || { name: a.name, count: 0, id: a.id };
        cur.count += 1;
        artistCount.set(a.id, cur);
      }
      const year = Number((t.album.release_date || "").slice(0, 4));
      const dec = decadeOf(year);
      yearCount.set(dec, (yearCount.get(dec) || 0) + 1);
      if (t.explicit) explicitCount += 1;
      if (typeof t.popularity === "number") {
        popSum += t.popularity;
        popN += 1;
      }
    }

    const topArtistsRaw = [...artistCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Pull genres from top artists.
    const artistDetails = await getArtistsByIds(
      topArtistsRaw.map((a) => a.id),
      token
    );
    const genreCount = new Map<string, number>();
    for (const a of artistDetails) {
      for (const g of a.genres || []) {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      }
    }
    const topGenres = [...genreCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const analysis: PlaylistAnalysis = {
      totalTracks: allTracks.length,
      uniqueArtists: artistCount.size,
      topArtists: topArtistsRaw.map((a) => ({ name: a.name, count: a.count })),
      topGenres,
      yearDistribution: [...yearCount.entries()]
        .map(([decade, count]) => ({ decade, count }))
        .sort((a, b) => b.count - a.count),
      avgPopularity: popN ? Math.round(popSum / popN) : 0,
      explicitRatio: allTracks.length ? explicitCount / allTracks.length : 0,
      sampleTracks: uniqueBy(
        allTracks.map((t) => ({ title: t.name, artist: t.artists[0]?.name || "" })),
        (x) => `${x.title}|${x.artist}`.toLowerCase()
      ).slice(0, 30),
    };

    const variationLabel: Record<typeof variation, string> = {
      muito_parecida: "muito parecida com as playlists analisadas",
      variada: "mais variada, mantendo o estilo central mas explorando vizinhos",
      mais_famosas: "com músicas mais famosas dentro do mesmo estilo",
      menos_obvias: "com músicas menos óbvias e mais raras dentro do mesmo estilo",
      mais_animada: "mais animada que as playlists analisadas",
      mais_calma: "mais calma que as playlists analisadas",
    };

    const inspirationContext = [
      `Total de músicas analisadas: ${analysis.totalTracks}`,
      `Artistas mais frequentes: ${analysis.topArtists.map((a) => a.name).join(", ")}`,
      `Gêneros prováveis: ${analysis.topGenres.map((g) => g.name).join(", ")}`,
      `Décadas predominantes: ${analysis.yearDistribution
        .slice(0, 3)
        .map((d) => `${d.decade} (${d.count})`)
        .join(", ")}`,
      `Popularidade média (0-100): ${analysis.avgPopularity}`,
      `Faixas explícitas: ${(analysis.explicitRatio * 100).toFixed(0)}%`,
      `Amostra de músicas: ${analysis.sampleTracks
        .slice(0, 20)
        .map((t) => `"${t.title}" — ${t.artist}`)
        .join("; ")}`,
    ].join("\n");

    const playlist = await generatePlaylistAI({
      prompt: `Crie uma playlist inspirada nestas playlists, ${variationLabel[variation]}. Não copie todas as músicas: misture artistas relacionados, faixas conhecidas e algumas escolhas criativas dentro do mesmo clima.`,
      options: {
        count,
        language: "qualquer",
        popularity:
          variation === "mais_famosas"
            ? "famosas"
            : variation === "menos_obvias"
              ? "menos_conhecidas"
              : "misto",
        energy:
          variation === "mais_animada"
            ? "alta"
            : variation === "mais_calma"
              ? "calma"
              : "qualquer",
        discoveryMode: variation === "menos_obvias",
        safeMode,
      },
      inspirationContext,
    });

    const response = NextResponse.json({
      analysis,
      playlist,
      playlistMetas,
    });
    out.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  } catch (e) {
    if (e instanceof SpotifyAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    if (e instanceof SpotifyApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof AnthropicError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
