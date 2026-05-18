import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify";
import { STATE_COOKIE, setTokenCookies } from "@/lib/cookies";

// Spotify redirects the user here after consent.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";

  if (error) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_code`);
  }
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  try {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI as string;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const res = NextResponse.redirect(`${appUrl}/create`);
    setTokenCookies(res, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
    // Clear the OAuth state cookie.
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "auth_failed";
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);
  }
}
