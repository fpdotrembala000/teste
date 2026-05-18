import { NextResponse } from "next/server";
import { readTokens, setTokenCookies } from "./cookies";
import type { SpotifyTrack, SpotifyUser, SpotifyArtist } from "@/types";
import { chunk, similarity, normalize } from "./utils";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-top-read",
  "ugc-image-upload",
].join(" ");

export class SpotifyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyAuthError";
  }
}

export class SpotifyApiError extends Error {
  status: number;
  endpoint?: string;
  constructor(message: string, status: number, endpoint?: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

function basicAuthHeader() {
  const id = process.env.SPOTIFY_CLIENT_ID || "";
  const secret = process.env.SPOTIFY_CLIENT_SECRET || "";
  if (!id || !secret) {
    throw new SpotifyAuthError(
      "SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET não configurados no .env.local"
    );
  }
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

// Exchange auth code for tokens.
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${SPOTIFY_AUTH_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new SpotifyAuthError(`Falha ao trocar código por token: ${text}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
  // eslint-disable-next-line no-console
  console.log("[spotify-auth] login ok, scopes concedidos:", data.scope);
  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${SPOTIFY_AUTH_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new SpotifyAuthError(`Falha ao renovar token: ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
}

// Returns a valid access token, refreshing it if expired.
// If a token was refreshed, the response object passed in (if any) gets
// updated cookies. Otherwise, callers should handle persistence themselves.
export async function getValidAccessToken(opts?: {
  res?: NextResponse;
}): Promise<string> {
  const { accessToken, refreshToken, expiresAt } = readTokens();
  if (!accessToken && !refreshToken) {
    throw new SpotifyAuthError("Não autenticado no Spotify");
  }
  // Considered valid if more than 30s left.
  if (accessToken && expiresAt && expiresAt - Date.now() > 30_000) {
    return accessToken;
  }
  if (!refreshToken) throw new SpotifyAuthError("Sessão expirada, faça login novamente");
  const refreshed = await refreshAccessToken(refreshToken);
  // Persist on the provided response, if any. If not, we still return the new
  // access token so the current request succeeds; subsequent requests will
  // either use the still-valid token (in-memory) or trigger another refresh.
  if (opts?.res) {
    setTokenCookies(opts.res, {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || refreshToken,
      expires_in: refreshed.expires_in,
    });
  }
  return refreshed.access_token;
}

// Generic fetch wrapper for Spotify Web API.
export async function spotifyFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const accessToken = token || (await getValidAccessToken());
  const url = path.startsWith("http") ? path : `${SPOTIFY_API}${path}`;
  const method = (init.method || "GET").toUpperCase();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as unknown as T;
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } })?.error?.message ||
      (typeof data === "string" ? data : "Erro na API do Spotify");
    // Detailed server-side log so the developer can see exactly what failed.
    // eslint-disable-next-line no-console
    console.error(
      `[spotify-api] ${method} ${url} -> ${res.status} ${res.statusText}: ${msg}`,
      typeof data === "object" ? data : ""
    );
    throw new SpotifyApiError(msg, res.status, `${method} ${path}`);
  }
  return data as T;
}

export async function getCurrentUser(token?: string): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>("/me", {}, token);
}

// Search a track by name + artist with simple fuzzy ranking.
export async function searchTrack(
  title: string,
  artist: string,
  token?: string
): Promise<SpotifyTrack | null> {
  // Use Spotify's field filters to improve precision.
  const q = `track:"${title}" artist:"${artist}"`;
  const params = new URLSearchParams({
    q,
    type: "track",
    limit: "8",
  });
  let data: { tracks?: { items: SpotifyTrack[] } };
  try {
    data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?${params.toString()}`,
      {},
      token
    );
  } catch {
    // Fallback to a looser search if the structured one errors.
    const fallback = new URLSearchParams({
      q: `${title} ${artist}`,
      type: "track",
      limit: "8",
    });
    data = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?${fallback.toString()}`,
      {},
      token
    );
  }
  let items = data.tracks?.items || [];
  if (items.length === 0) {
    // Looser fallback.
    const fallback = new URLSearchParams({
      q: `${title} ${artist}`,
      type: "track",
      limit: "8",
    });
    const more = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?${fallback.toString()}`,
      {},
      token
    );
    items = more.tracks?.items || [];
  }
  if (!items.length) return null;

  // Score each candidate by combined title+artist similarity.
  const scored = items.map((t) => {
    const titleScore = similarity(t.name, title);
    const artistJoined = t.artists.map((a) => a.name).join(" ");
    const artistScore = Math.max(
      similarity(artistJoined, artist),
      ...t.artists.map((a) => similarity(a.name, artist))
    );
    // Bonus if normalized title contains exact target.
    const containsBonus =
      normalize(t.name).includes(normalize(title)) ? 0.05 : 0;
    return { t, score: titleScore * 0.55 + artistScore * 0.45 + containsBonus };
  });
  scored.sort((a, b) => b.score - a.score);
  // Require a reasonable threshold to consider a match.
  return scored[0].score >= 0.4 ? scored[0].t : null;
}

export async function createPlaylist(params: {
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  token?: string;
}) {
  return spotifyFetch<{
    id: string;
    external_urls: { spotify: string };
    uri: string;
  }>(
    `/users/${encodeURIComponent(params.userId)}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        public: params.isPublic,
      }),
    },
    params.token
  );
}

export async function addTracksToPlaylist(
  playlistId: string,
  uris: string[],
  token?: string
) {
  // Spotify limits to 100 URIs per call.
  for (const part of chunk(uris, 100)) {
    await spotifyFetch(
      `/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        body: JSON.stringify({ uris: part }),
      },
      token
    );
  }
}

export async function getPlaylistTracks(playlistId: string, token?: string) {
  const tracks: SpotifyTrack[] = [];
  let url:
    | string
    | null = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(id,uri,name,explicit,popularity,duration_ms,artists(id,name),album(id,name,release_date,images))),next`;
  while (url) {
    const data: {
      items: { track: SpotifyTrack | null }[];
      next: string | null;
    } = await spotifyFetch(url, {}, token);
    for (const it of data.items) if (it.track) tracks.push(it.track);
    url = data.next ? data.next.replace("https://api.spotify.com/v1", "") : null;
  }
  return tracks;
}

export async function getPlaylistMeta(playlistId: string, token?: string) {
  return spotifyFetch<{
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
    owner: { display_name: string };
    tracks: { total: number };
    external_urls: { spotify: string };
  }>(
    `/playlists/${playlistId}?fields=id,name,description,images,owner(display_name),tracks(total),external_urls`,
    {},
    token
  );
}

export async function getArtistsByIds(ids: string[], token?: string) {
  const out: SpotifyArtist[] = [];
  for (const part of chunk(ids, 50)) {
    if (!part.length) continue;
    const data = await spotifyFetch<{ artists: SpotifyArtist[] }>(
      `/artists?ids=${part.join(",")}`,
      {},
      token
    );
    out.push(...data.artists);
  }
  return out;
}

export async function getTopItems<T>(
  type: "tracks" | "artists",
  timeRange: "short_term" | "medium_term" | "long_term",
  limit = 50,
  token?: string
): Promise<T[]> {
  const params = new URLSearchParams({
    time_range: timeRange,
    limit: String(limit),
  });
  const data = await spotifyFetch<{ items: T[] }>(
    `/me/top/${type}?${params.toString()}`,
    {},
    token
  );
  return data.items;
}
