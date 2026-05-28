const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/profiles/${slug}`, {
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const body = await request.text();
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/profiles/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/api/profiles/${slug}/reset`, {
      method: "POST",
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return new Response("Could not connect to backend server.", { status: 502 });
  }
}
