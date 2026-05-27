"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SessionInfo } from "@/types/agent";
import { setActiveSessionId } from "@/app/actions/session-cookie";

export function useSession(initialSessionId: string) {
  const router = useRouter();
  const sessionId = initialSessionId;
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const creatingRef = useRef(false);

  const createSession = useCallback(async (name?: string) => {
    if (creatingRef.current) return initialSessionId;
    creatingRef.current = true;
    try {
      const opts: RequestInit = { method: "POST" };
      if (name) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify({ name });
      }
      const res = await fetch("/api/agents/sessions", opts);
      const data = await res.json();
      sessionStorage.setItem(`session-${data.session_id}`, "1");
      sessionStorage.setItem(`session-fresh-${data.session_id}`, "1");
      await setActiveSessionId(data.session_id);
      setSessionName(name || null);
      router.replace(`/legal/${data.session_id}`);
      return data.session_id;
    } finally {
      creatingRef.current = false;
    }
  }, [router, initialSessionId]);

  const resumeSession = useCallback(
    async (id: string) => {
      const target = sessions.find((s) => s.session_id === id);
      setSessionName(target?.name || null);
      await setActiveSessionId(id);
      router.push(`/legal/${id}`);
    },
    [router, sessions],
  );

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/agents/sessions");
    const data = await res.json();
    setSessions(data);
    const current = data.find((s: SessionInfo) => s.session_id === sessionId);
    if (current?.name) setSessionName(current.name);
    return data;
  }, [sessionId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    return await createSession();
  }, [sessionId, createSession]);

  const updateSessionName = useCallback((id: string, name: string) => {
    if (id === initialSessionId) {
      setSessionName(name);
    }
    setSessions((prev) => {
      const exists = prev.some((s) => s.session_id === id);
      if (exists) {
        return prev.map((s) => (s.session_id === id ? { ...s, name } : s));
      }
      return [
        { session_id: id, name, created_at: new Date().toISOString(), agents_used: [], turns: 0 },
        ...prev,
      ];
    });
  }, [initialSessionId]);

  return {
    sessionId,
    sessionName,
    sessions,
    loading,
    createSession,
    resumeSession,
    fetchSessions,
    ensureSession,
    updateSessionName,
  };
}
