import { NextRequest, NextResponse } from "next/server";
import {
  getTopItems,
  getValidAccessToken,
  SpotifyApiError,
  SpotifyAuthError,
} from "@/lib/spotify";
import type { SpotifyArtist, SpotifyTrack } from "@/types";

// Returns the user's top tracks and top artists for a given time range.
export async function GET(req: NextRequest) {
  const out = NextResponse.next();
  try {
    const url = new URL(req.url);
    const timeRange = (url.searchParams.get("range") || "medium_term") as
      | "short_term"
      | "medium_term"
      | "long_term";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 30)));

    if (!["short_term", "medium_term", "long_term"].includes(timeRange)) {
      return NextResponse.json({ error: "range inválido" }, { status: 400 });
    }

    const token = await getValidAccessToken({ res: out });

    const [tracks, artists] = await Promise.all([
      getTopItems<SpotifyTrack>("tracks", timeRange, limit, token),
      getTopItems<SpotifyArtist>("artists", timeRange, limit, token),
    ]);

    // Aggregate genres from artists.
    const genreCount = new Map<string, number>();
    for (const a of artists) {
      for (const g of a.genres || []) {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      }
    }
    const topGenres = [...genreCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const response = NextResponse.json({
      timeRange,
      tracks,
      artists,
      topGenres,
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
