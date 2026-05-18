import { NextRequest, NextResponse } from "next/server";
import { createSpotifyPlaylistSchema } from "@/lib/validators";
import {
  addTracksToPlaylist,
  createPlaylist,
  getCurrentUser,
  getValidAccessToken,
  searchTrack,
  SpotifyApiError,
  SpotifyAuthError,
} from "@/lib/spotify";
import type { MatchedSong } from "@/types";

// Search each song on Spotify, create the playlist, add the matched URIs.
export async function POST(req: NextRequest) {
  const out = NextResponse.next();
  try {
    const parsed = createSpotifyPlaylistSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, description, isPublic, songs, safeMode } = parsed.data;

    const token = await getValidAccessToken({ res: out });
    const user = await getCurrentUser(token);

    // Search all songs in parallel (capped concurrency).
    const matched: MatchedSong[] = [];
    const concurrency = 5;
    let idx = 0;
    async function worker() {
      while (idx < songs.length) {
        const i = idx++;
        const s = songs[i];
        try {
          const t = await searchTrack(s.title, s.artist, token);
          if (!t) {
            matched[i] = { ...s, matched: false };
            continue;
          }
          if (safeMode && t.explicit) {
            matched[i] = { ...s, matched: false };
            continue;
          }
          matched[i] = {
            ...s,
            matched: true,
            spotifyUri: t.uri,
            spotifyId: t.id,
            spotifyUrl: t.external_urls?.spotify,
            albumImage: t.album.images?.[0]?.url,
            durationMs: t.duration_ms,
            explicit: t.explicit,
          };
        } catch {
          matched[i] = { ...s, matched: false };
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));

    // De-duplicate URIs (Spotify rejects duplicates in same call sometimes).
    const seenUri = new Set<string>();
    const uris: string[] = [];
    for (const m of matched) {
      if (m?.matched && m.spotifyUri && !seenUri.has(m.spotifyUri)) {
        seenUri.add(m.spotifyUri);
        uris.push(m.spotifyUri);
      }
    }

    if (!uris.length) {
      return NextResponse.json(
        {
          error:
            "Nenhuma das músicas sugeridas foi encontrada no Spotify. Tente gerar outra versão.",
          matched,
        },
        { status: 422 }
      );
    }

    const playlist = await createPlaylist({
      userId: user.id,
      name,
      description,
      isPublic,
      token,
    });

    await addTracksToPlaylist(playlist.id, uris, token);

    const response = NextResponse.json({
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      matched,
      summary: {
        suggested: songs.length,
        found: uris.length,
        notFound: songs.length - uris.length,
      },
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
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
