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
    const error = await backendResponse.text();
    return new Response(error || `The server responded with an error (status ${backendResponse.status})`, {
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
