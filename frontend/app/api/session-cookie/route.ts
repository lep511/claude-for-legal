import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "active-session-id";
const CONSENT_COOKIE = "cookie-consent";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET() {
  const cookieStore = await cookies();
  const consent = cookieStore.get(CONSENT_COOKIE)?.value === "accepted";
  const value = cookieStore.get(COOKIE_NAME)?.value;
  const sessionId = consent && value && /^[a-f0-9]{12}$/.test(value) ? value : null;
  return NextResponse.json({ sessionId, consent });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, sessionId } = body as { action: string; sessionId?: string };
  const cookieStore = await cookies();

  if (action === "accept-consent") {
    cookieStore.set(CONSENT_COOKIE, "accepted", {
      path: "/",
      maxAge: CONSENT_MAX_AGE,
      sameSite: "lax",
      httpOnly: false,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "set" && sessionId && /^[a-f0-9]{12}$/.test(sessionId)) {
    if (cookieStore.get(CONSENT_COOKIE)?.value !== "accepted") {
      return NextResponse.json({ ok: false, reason: "no-consent" });
    }
    cookieStore.set(COOKIE_NAME, sessionId, {
      path: "/",
      maxAge: MAX_AGE,
      sameSite: "lax",
      httpOnly: false,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear") {
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, reason: "invalid-action" }, { status: 400 });
}
