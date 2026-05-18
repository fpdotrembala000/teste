import { NextResponse } from "next/server";
import { getCurrentUser, getValidAccessToken, SpotifyAuthError } from "@/lib/spotify";

// Returns minimal info about the currently authenticated user (or 401).
export async function GET() {
  try {
    const res = NextResponse.next();
    const token = await getValidAccessToken({ res });
    const user = await getCurrentUser(token);
    const out = NextResponse.json({ authenticated: true, user });
    // Forward refreshed cookies if any.
    res.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  } catch (e) {
    if (e instanceof SpotifyAuthError) {
      return NextResponse.json({ authenticated: false, error: e.message }, { status: 401 });
    }
    return NextResponse.json(
      { authenticated: false, error: "unknown" },
      { status: 401 }
    );
  }
}
