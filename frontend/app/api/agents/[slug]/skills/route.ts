const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${PYTHON_BACKEND_URL}/api/agents/${slug}/skills`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}
