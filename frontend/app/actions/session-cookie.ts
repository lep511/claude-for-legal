export async function acceptCookieConsent(): Promise<void> {
  await fetch("/api/session-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "accept-consent" }),
  });
}

export async function setActiveSessionId(sessionId: string): Promise<void> {
  await fetch("/api/session-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set", sessionId }),
  });
}

export async function clearActiveSessionId(): Promise<void> {
  await fetch("/api/session-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clear" }),
  });
}
