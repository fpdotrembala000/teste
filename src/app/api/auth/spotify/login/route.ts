import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { SPOTIFY_SCOPES, SpotifyAuthError } from "@/lib/spotify";
import { STATE_COOKIE } from "@/lib/cookies";

// Starts the OAuth Authorization Code flow.
export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new SpotifyAuthError(
        "Variáveis SPOTIFY_CLIENT_ID e SPOTIFY_REDIRECT_URI não configuradas."
      );
    }

    const state = randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      state,
      show_dialog: "false",
    });

    const res = NextResponse.redirect(
      `https://accounts.spotify.com/authorize?${params.toString()}`
    );
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const url = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000");
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url);
  }
}
