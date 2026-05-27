import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename } = await params;
  const res = await fetch(
    `${PYTHON_BACKEND_URL}/api/sessions/${id}/files/${filename}`,
  );

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const safeFilename = filename.replace(/["\\\/\n\r]/g, "_");
  headers.set("Content-Disposition", `attachment; filename="${safeFilename}"`);

  return new Response(res.body, { headers });
}
