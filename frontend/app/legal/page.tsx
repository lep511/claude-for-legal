import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LegalRedirect from "./LegalRedirect";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export default async function LegalPage() {
  const cookieStore = await cookies();
  const consent = cookieStore.get("cookie-consent")?.value === "accepted";
  const activeSession = cookieStore.get("active-session-id")?.value;

  if (consent && activeSession && /^[a-f0-9]{12}$/.test(activeSession)) {
    try {
      const res = await fetch(`${PYTHON_BACKEND_URL}/api/sessions/${activeSession}`, {
        cache: "no-store",
      });
      if (res.ok) {
        redirect(`/legal/${activeSession}`);
      }
    } catch {
      // Backend unreachable — fall through to client redirect UI
    }
  }

  return <LegalRedirect />;
}
