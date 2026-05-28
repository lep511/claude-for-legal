const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/profiles`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}
