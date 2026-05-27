"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, WifiOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { setActiveSessionId } from "@/app/actions/session-cookie";

type Status = "connecting" | "checking" | "creating" | "redirecting" | "error";

const RETRY_DELAY = 15;
const MAX_AUTO_RETRIES = 3;

function StepIndicator({ step, current, label }: { step: Status; current: Status; label: string }) {
  const order: Status[] = ["connecting", "checking", "creating", "redirecting"];
  const stepIdx = order.indexOf(step);
  const currentIdx = order.indexOf(current);

  const isDone = current !== "error" && currentIdx > stepIdx;
  const isActive = current === step;
  const isPending = current !== "error" && currentIdx < stepIdx;

  return (
    <div className={`flex items-center gap-2.5 transition-opacity duration-300 ${isPending ? "opacity-40" : "opacity-100"}`}>
      {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
      {isActive && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
      {isPending && <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />}
      {current === "error" && isActive && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
      <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export default function LegalRedirect() {
  const router = useRouter();
  const initRef = useRef(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<"network" | "server" | "unknown">("unknown");
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const failedStep = useRef<Status>("connecting");

  const statusRef = useRef<Status>("connecting");
  const initFnRef = useRef<() => void>(() => {});

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const init = useCallback(async () => {
    clearCountdown();
    setStatus("connecting");
    setErrorMessage("");
    setCountdown(0);

    try {
      setStatus("checking");
      statusRef.current = "checking";
      const listRes = await fetch("/api/agents/sessions");
      if (!listRes.ok) throw new Error(`Server responded with status ${listRes.status}`);

      const sessions = await listRes.json();
      if (sessions.length > 0) {
        setStatus("redirecting");
        const id = sessions[0].session_id;
        sessionStorage.setItem(`session-${id}`, "1");
        await setActiveSessionId(id);
        router.replace(`/legal/${id}`);
        return;
      }

      setStatus("creating");
      statusRef.current = "creating";
      const res = await fetch("/api/agents/sessions", { method: "POST" });
      if (!res.ok) throw new Error(`Server responded with status ${res.status}`);

      const data = await res.json();
      setStatus("redirecting");
      sessionStorage.setItem(`session-${data.session_id}`, "1");
      sessionStorage.setItem(`session-fresh-${data.session_id}`, "1");
      await setActiveSessionId(data.session_id);
      router.replace(`/legal/${data.session_id}`);
    } catch (err: any) {
      const msg = err?.message || "";
      const isNetwork = msg.includes("fetch") || msg.includes("Failed") || msg.includes("502");
      const isServer = msg.includes("status 5");

      failedStep.current = statusRef.current === "connecting" || statusRef.current === "checking" ? "checking" : "creating";
      setErrorType(isNetwork ? "network" : isServer ? "server" : "unknown");
      setStatus("error");
      setErrorMessage(
        isNetwork
          ? "The backend server is not reachable. Make sure it is running on port 8000."
          : isServer
            ? "The backend server returned an internal error. Check the server logs for details."
            : msg || "An unexpected error occurred while connecting.",
      );
      setCountdown(RETRY_DELAY);
      setRetryCount((c) => c + 1);
    }
  }, [router]);

  useEffect(() => { initFnRef.current = init; });

  useEffect(() => {
    if (status !== "error" || retryCount > MAX_AUTO_RETRIES) return;
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearCountdown();
          initFnRef.current();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return clearCountdown;
  }, [status, retryCount]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    init();
  }, [init]);

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden bg-background">
      <Image
        src="/hero.png"
        alt=""
        fill
        className="object-cover opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none"
        priority
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6 max-w-sm">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/ant-logo.svg"
            alt="Legal Agents"
            width={44}
            height={44}
            className="dark:invert"
          />
          <h1 className="text-lg font-semibold text-foreground">Legal Agents</h1>
        </div>

        <div className="w-full rounded-xl border bg-card/80 backdrop-blur-sm p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <StepIndicator step="checking" current={status} label="Connecting to backend" />
            <StepIndicator step="creating" current={status} label="Loading session" />
            <StepIndicator step="redirecting" current={status} label="Ready" />
          </div>
        </div>

        {status === "error" && (
          <div className="w-full animate-fade-in-up flex flex-col gap-4">
            <div className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-sm p-4 text-left">
              <div className="flex items-start gap-3">
                {errorType === "network" ? (
                  <WifiOff className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <Server className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    {errorType === "network" ? "Backend unreachable" : "Server error"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {retryCount <= MAX_AUTO_RETRIES && countdown > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Retrying in {countdown}s...
                </p>
              ) : retryCount > MAX_AUTO_RETRIES ? (
                <p className="text-xs text-muted-foreground">
                  Auto-retry exhausted
                </p>
              ) : (
                <span />
              )}
              <Button
                onClick={() => {
                  setRetryCount(0);
                  init();
                }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry now
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
