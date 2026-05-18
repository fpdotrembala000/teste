import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Cookie names used by the auth flow.
export const ACCESS_TOKEN_COOKIE = "sp_access_token";
export const REFRESH_TOKEN_COOKIE = "sp_refresh_token";
export const EXPIRES_AT_COOKIE = "sp_expires_at";
export const STATE_COOKIE = "sp_oauth_state";

const isProd = process.env.NODE_ENV === "production";

export interface SpotifyTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
}

// Persist tokens into HttpOnly cookies on a NextResponse.
export function setTokenCookies(res: NextResponse, tokens: SpotifyTokenSet) {
  const expiresAt = Date.now() + tokens.expires_in * 1000;

  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    // Keep cookie alive a bit longer than the token, refresh handles validity.
    maxAge: 60 * 60 * 24 * 30,
  });

  if (tokens.refresh_token) {
    res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }

  res.cookies.set(EXPIRES_AT_COOKIE, String(expiresAt), {
    httpOnly: false, // readable by client to display state
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearTokenCookies(res: NextResponse) {
  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    EXPIRES_AT_COOKIE,
    STATE_COOKIE,
  ]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

// Read tokens from cookies in a server component / route handler.
export function readTokens() {
  const c = cookies();
  return {
    accessToken: c.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: c.get(REFRESH_TOKEN_COOKIE)?.value,
    expiresAt: Number(c.get(EXPIRES_AT_COOKIE)?.value || 0),
  };
}
