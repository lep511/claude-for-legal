import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const filename = req.nextUrl.searchParams.get("name");
  const format = req.nextUrl.searchParams.get("format");

  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  const qs = format ? `?format=${format}` : "";
  const res = await fetch(
    `${PYTHON_BACKEND_URL}/api/sessions/${id}/files/${encodeURIComponent(filename)}${qs}`,
  );

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const disposition = res.headers.get("content-disposition");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  } else {
    const safeFilename = filename.replace(/["\\\/\n\r]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${safeFilename}"`);
  }

  return new Response(res.body, { headers });
}
