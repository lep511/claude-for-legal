const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions`);
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    let body: string | undefined;
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await request.text();
    }
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}
