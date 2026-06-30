import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions/${id}/status`);
    if (!res.ok) {
      return Response.json({ session_id: id, is_busy: false });
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ session_id: id, is_busy: false });
  }
}
