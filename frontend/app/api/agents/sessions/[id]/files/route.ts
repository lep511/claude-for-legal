import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const res = await fetch(
      `${PYTHON_BACKEND_URL}/api/sessions/${id}/files`,
    );
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}
