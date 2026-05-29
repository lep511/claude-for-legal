"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Message, FileUpload } from "@/types/agent";
import TopNavBar from "@/components/TopNavBar";
import { useSession } from "@/hooks/useSession";
import { useAgentStream } from "@/hooks/useAgentStream";
import { SessionControls } from "@/components/SessionControls";
import { ChatMessageList } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { VisualizationPanel, type Visualization } from "@/components/VisualizationPanel";
import { readFileAsBase64 } from "@/utils/fileHandling";
import { extractMarkdownTables } from "@/utils/extractTables";
import { setActiveSessionId, clearActiveSessionId } from "@/app/actions/session-cookie";

const ChartPagination = ({
  total,
  current,
  onDotClick,
}: {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}) => {
  const prevTotalRef = useRef(total);
  const [newIndex, setNewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (total > prevTotalRef.current) {
      if (current !== 0) {
        startTransition(() => setNewIndex(0));
        const timer = setTimeout(() => startTransition(() => setNewIndex(null)), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevTotalRef.current = total;
  }, [total, current]);

  return (
    <div className="fixed right-12 top-1/2 -translate-y-1/2 flex flex-col gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            i === current
              ? "bg-primary scale-125"
              : i === newIndex
                ? "bg-primary/80 animate-[chart-notify_1.5s_ease-in-out_infinite]"
                : "bg-muted hover:bg-primary/50"
          }`}
        />
      ))}
    </div>
  );
};

export default function AIChat() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chartEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUpload, setCurrentUpload] = useState<FileUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sessionFiles, setSessionFiles] = useState<
    { filename: string; size: number; path: string }[]
  >([]);
  const [autoExecute, setAutoExecute] = useState(true);

  const {
    sessionId,
    sessionName,
    sessions,
    createSession,
    resumeSession,
    fetchSessions,
    ensureSession,
    updateSessionName,
  } = useSession(params.sessionId);

  const {
    isStreaming,
    sessionBusy: streamBusy,
    sendMessage,
    abort,
  } = useAgentStream();

  const [sessionBusy, setSessionBusy] = useState(false);
  const effectiveBusy = sessionBusy || streamBusy;

  const fetchSessionFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/agents/sessions/${sessionId}/files`);
      if (res.ok) {
        const data = await res.json();
        setSessionFiles(data.filter((f: any) => !f.filename.endsWith(".chart.json")));
      }
    } catch {}
  }, [sessionId]);

  const loadSessionData = useCallback(async (id: string): Promise<{ messages: Message[]; name?: string } | null> => {
    try {
      const res = await fetch(`/api/agents/sessions/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.turns || data.turns.length === 0) return { messages: [], name: data.name };

      const turns: any[] = data.turns;
      const restored: Message[] = [];

      for (let i = 0; i < turns.length; i++) {
        const t = turns[i];
        if (t.role === "user") {
          restored.push({
            id: crypto.randomUUID(),
            role: "user" as const,
            content: t.content,
          });
        } else if (t.role === "agent" && t.content?.trim()) {
          restored.push({
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: t.content,
            agentSlug: t.agent || undefined,
          });
        } else if (t.role === "orchestrator" && t.content?.trim()) {
          const nextTurn = turns[i + 1];
          const isFollowedByAgent = nextTurn && nextTurn.role === "agent";
          if (!isFollowedByAgent) {
            restored.push({
              id: crypto.randomUUID(),
              role: "assistant" as const,
              content: t.content,
            });
          }
        }
      }

      if (data.charts && data.charts.length > 0) {
        const agentMsgs = restored.filter((m) => m.role === "assistant" && m.agentSlug);
        const assistantMsgs = restored.filter((m) => m.role === "assistant");
        const targets = agentMsgs.length > 0 ? agentMsgs : assistantMsgs;
        for (let i = 0; i < data.charts.length; i++) {
          const target = targets[targets.length - data.charts.length + i];
          if (target) {
            target.chartData = data.charts[i];
          } else if (targets.length > 0) {
            targets[targets.length - 1].chartData = data.charts[i];
          } else if (restored.length > 0) {
            const lastAssistant = [...restored].reverse().find((m) => m.role === "assistant");
            if (lastAssistant) lastAssistant.chartData = data.charts[i];
          }
        }
      }

      for (const msg of restored) {
        if (msg.role === "assistant" && msg.content) {
          const tables = extractMarkdownTables(msg.content);
          if (tables.length > 0) msg.tableData = tables;
        }
      }

      if (restored.length > 0 && restored[restored.length - 1].role === "user") {
        restored.push({
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: "*This session was interrupted. You can continue the conversation below.*",
        });
      }

      return { messages: restored, name: data.name };
    } catch {
      return null;
    }
  }, []);

  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const isInvalidSessionFormat = !!sessionId && !/^[a-f0-9]{12}$/.test(sessionId);
  const prevSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || isInvalidSessionFormat) return;

    const targetId = sessionId;
    const alreadyLoaded = prevSessionRef.current === targetId;
    prevSessionRef.current = targetId;

    if (alreadyLoaded) return;

    startTransition(() => {
      setSessionNotFound(false);
      setSessionBusy(false);
    });

    const isFresh = sessionStorage.getItem(`session-fresh-${targetId}`);
    if (isFresh) {
      sessionStorage.removeItem(`session-fresh-${targetId}`);
      startTransition(() => setSessionVerified(true));
      setActiveSessionId(targetId);
      return;
    }

    loadSessionData(targetId).then((result) => {
      if (prevSessionRef.current !== targetId) return;
      if (result === null) {
        setSessionNotFound(true);
        clearActiveSessionId();
      } else {
        sessionStorage.setItem(`session-${targetId}`, "1");
        if (result.name) sessionStorage.setItem(`session-name-${targetId}`, result.name);
        setSessionVerified(true);
        setActiveSessionId(targetId);
        if (result.name) updateSessionName(targetId, result.name);
        if (result.messages.length > 0) {
          setMessages(result.messages);
          fetchSessionFiles();
        }
      }
    });

    fetch(`/api/agents/sessions/${targetId}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (prevSessionRef.current === targetId && data.is_busy) {
          setSessionBusy(true);
        }
      })
      .catch(() => {});
  }, [sessionId, isInvalidSessionFormat, loadSessionData, router, fetchSessionFiles, updateSessionName]);

  useEffect(() => {
    if (!isStreaming && sessionId && sessionVerified) {
      startTransition(() => {
        setSessionBusy(false);
      });
      fetch(`/api/agents/sessions/${sessionId}/files`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setSessionFiles(data.filter((f: any) => !f.filename.endsWith(".chart.json")));
        })
        .catch(() => {});
    }
  }, [isStreaming, sessionId, sessionVerified]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [messages, isStreaming, sessionBusy]);

  const handleChartScroll = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollTop, clientHeight } = contentRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    setCurrentChartIndex(newIndex);
  }, []);

  const scrollToChart = (index: number) => {
    if (!contentRef.current) return;
    const targetScroll = index * contentRef.current.clientHeight;
    contentRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  const handleNewSession = async () => {
    setMessages([]);
    setSessionFiles([]);
    setSessionBusy(false);
    await createSession();
  };

  const handleResumeSession = (id: string) => {
    setMessages([]);
    setSessionFiles([]);
    setCurrentChartIndex(0);
    setCurrentUpload(null);
    setSessionBusy(false);
    prevSessionRef.current = null;
    resumeSession(id);
  };

  const handleDeleteSession = async (id: string) => {
    await fetch(`/api/agents/sessions/${id}`, { method: "DELETE" });
    sessionStorage.removeItem(`session-${id}`);
    sessionStorage.removeItem(`session-fresh-${id}`);
    const updated = await fetchSessions();
    if (sessionId === id) {
      setMessages([]);
      setSessionFiles([]);
      if (updated.length > 0) {
        prevSessionRef.current = null;
        resumeSession(updated[0].session_id);
      } else {
        await createSession();
      }
    }
  };

  const handleRenameSession = async (id: string, name: string) => {
    await fetch(`/api/agents/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    updateSessionName(id, name);
    await fetchSessions();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ["csv", "docx", "xls", "xlsx", "md", "pdf"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      toast({
        title: "Unsupported file type",
        description: `Only ${allowedExtensions.join(", ")} files are allowed.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const base64Data = await readFileAsBase64(file);

      const sid = await ensureSession();
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/agents/sessions/${sid}/upload`, {
        method: "POST",
        body: formData,
      });

      setCurrentUpload({
        base64: base64Data,
        fileName: file.name,
        mediaType: file.type || "application/octet-stream",
        isText: ["csv", "md"].includes(ext),
      });

      toast({ title: "File uploaded", description: `${file.name} ready` });
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to process the file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() && !currentUpload) return;
    if (isStreaming || effectiveBusy) return;

    const sid = await ensureSession();
    if (!sessionVerified) setSessionVerified(true);

    let messageText = input;
    if (currentUpload) {
      messageText = `[File: ${currentUpload.fileName}] ${input}`;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      file: currentUpload || undefined,
    };

    const streamingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, streamingMessage]);
    setInput("");
    setCurrentUpload(null);

    sendMessage(
      sid,
      messageText,
      (text) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: text,
            isStreaming: true,
          };
          return updated;
        });
      },
      (finalMessage) => {
        const tables = extractMarkdownTables(finalMessage.content);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...finalMessage,
            isStreaming: false,
            tableData: tables.length > 0 ? tables : undefined,
          };
          return updated;
        });
      },
      {
        autoExecute,
        onSessionName: (name) => updateSessionName(sid, name),
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || currentUpload) {
        const form = e.currentTarget.form;
        if (form) {
          form.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
        }
      }
    }
  };

  const visualizations = useMemo<Visualization[]>(() => {
    const items: Visualization[] = [];
    messages.forEach((msg, idx) => {
      if (msg.chartData)
        items.push({ type: "chart", data: msg.chartData, messageIndex: idx });
      if (msg.tableData) {
        msg.tableData.forEach((t) =>
          items.push({ type: "table", data: t, messageIndex: idx }),
        );
      }
    });
    return items;
  }, [messages]);

  const prevVizCountRef = useRef(visualizations.length);
  useEffect(() => {
    if (visualizations.length > prevVizCountRef.current) {
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      setCurrentChartIndex(0);
    }
    prevVizCountRef.current = visualizations.length;
  }, [visualizations.length]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    setInput(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
  };

  if (sessionNotFound || isInvalidSessionFormat) {
    const handleClose = async () => {
      const savedName = sessionName || sessionStorage.getItem(`session-name-${params.sessionId}`) || undefined;
      try {
        await createSession(savedName);
      } catch {
        try {
          await createSession();
        } catch {
          router.replace("/legal");
        }
      }
    };

    return (
      <div className="relative flex items-center justify-center h-screen overflow-hidden bg-background">
        <Image
          src="/hero.png"
          alt=""
          fill
          className="object-cover opacity-[0.07] dark:opacity-[0.04] pointer-events-none select-none"
          priority
        />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6 max-w-sm">
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

          <div className="w-full rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <SearchX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">Session not found</h2>
                <p className="text-sm text-muted-foreground">
                  The session{" "}
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {params.sessionId}
                  </span>{" "}
                  does not exist or has been deleted.
                </p>
              </div>
              <Button
                onClick={handleClose}
                variant="outline"
                className="gap-2 mt-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TopNavBar
        features={{
          showDomainSelector: false,
          showViewModeSelector: false,
          showPromptCaching: false,
        }}
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background p-2 sm:p-4 pt-0 gap-2 sm:gap-4 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Chat Panel */}
        <Card className="w-full lg:w-2/5 xl:w-1/3 flex flex-col min-h-0 h-full">
          <CardHeader className="py-2 px-3 sm:py-3 sm:px-4 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border shrink-0">
                  <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">
                    Legal Agents
                  </CardTitle>
                  <CardDescription className="text-xs hidden sm:block">
                    Multi-agent platform
                  </CardDescription>
                </div>
              </div>

              <SessionControls
                sessionId={sessionId}
                sessionName={sessionName}
                sessions={sessions}
                disabled={isStreaming || effectiveBusy}
                chatEmpty={messages.length === 0}
                onNewSession={handleNewSession}
                onResumeSession={handleResumeSession}
                onDeleteSession={handleDeleteSession}
                onRenameSession={handleRenameSession}
                onFetchSessions={fetchSessions}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={autoExecute}
                onCheckedChange={setAutoExecute}
              />
              <span className="text-xs text-muted-foreground">
                Auto-execute
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 scroll-smooth min-h-0">
            <ChatMessageList
              messages={messages}
              sessionId={sessionId}
              messagesEndRef={messagesEndRef}
            />
          </CardContent>

          <CardFooter className="p-2 sm:p-4 border-t shrink-0">
            <ChatInput
              input={input}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onSubmit={handleSubmit}
              onFileSelect={handleFileSelect}
              onAbort={abort}
              onRemoveUpload={() => setCurrentUpload(null)}
              currentUpload={currentUpload}
              isStreaming={isStreaming}
              sessionBusy={effectiveBusy}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
            />
          </CardFooter>
        </Card>

        {/* Content Area */}
        <VisualizationPanel
          visualizations={visualizations}
          sessionFiles={sessionFiles}
          sessionId={sessionId}
          onChartScroll={handleChartScroll}
          contentRef={contentRef}
          chartEndRef={chartEndRef}
        />
      </div>
      {visualizations.length > 0 && (
        <ChartPagination
          total={visualizations.length}
          current={currentChartIndex}
          onDotClick={scrollToChart}
        />
      )}
    </div>
  );
}
