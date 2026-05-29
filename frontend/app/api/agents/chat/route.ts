import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    return new Response(
      `Could not connect to the server. Verify that the backend is running at ${PYTHON_BACKEND_URL}.`,
      { status: 502 },
    );
  }

  if (!backendResponse.ok) {
    const raw = await backendResponse.text();
    let errorMessage = raw || `The server responded with an error (status ${backendResponse.status})`;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.detail) errorMessage = parsed.detail;
    } catch {}
    return new Response(errorMessage, {
      status: backendResponse.status,
    });
  }

  return new Response(backendResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
