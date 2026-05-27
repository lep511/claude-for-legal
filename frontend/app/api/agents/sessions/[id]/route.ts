import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions/${id}`);

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
