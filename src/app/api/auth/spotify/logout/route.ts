import { NextResponse } from "next/server";
import { clearTokenCookies } from "@/lib/cookies";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearTokenCookies(res);
  return res;
}

export async function GET() {
  const res = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"}/login`
  );
  clearTokenCookies(res);
  return res;
}
