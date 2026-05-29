"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentMessage, FileOutput, SSEEvent } from "@/types/agent";
import type { ChartData } from "@/types/chart";

interface StreamState {
  isStreaming: boolean;
  currentAgent: string | null;
  toolsUsed: string[];
  outputFiles: FileOutput[];
  error: string | null;
  sessionBusy: boolean;
}

export function useAgentStream() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    currentAgent: null,
    toolsUsed: [],
    outputFiles: [],
    error: null,
    sessionBusy: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");

  function processEvent(
    event: SSEEvent,
    onTextUpdate: (text: string) => void,
    toolsUsed: string[],
    outputFiles: FileOutput[],
    setAgent: (slug: string) => void,
    setChartData: (data: ChartData) => void,
    onSessionName?: (name: string) => void,
  ) {
    switch (event.event) {
      case "text":
        contentRef.current += event.data.content || "";
        onTextUpdate(contentRef.current);
        break;

      case "route": {
        setAgent(event.data.agent_slug);
        const routeMsg = `\n\n---\n**→ ${event.data.agent_slug}** — ${event.data.description}\n\n`;
        contentRef.current += routeMsg;
        onTextUpdate(contentRef.current);
        break;
      }

      case "handoff": {
        const handoffMsg = `\n\n---\n**⤳ Handoff to ${event.data.to_agent}** — ${event.data.reason}\n\n`;
        contentRef.current += handoffMsg;
        onTextUpdate(contentRef.current);
        break;
      }

      case "tool_start":
        if (!toolsUsed.includes(event.data.tool_name)) {
          toolsUsed.push(event.data.tool_name);
          setState((s) => ({ ...s, toolsUsed: [...toolsUsed] }));
        }
        break;

      case "tool_end":
        break;

      case "file_output":
        outputFiles.push({
          filename: event.data.filename,
          path: event.data.path,
        });
        setState((s) => ({ ...s, outputFiles: [...outputFiles] }));
        break;

      case "chart_data":
        setChartData(event.data as unknown as ChartData);
        break;

      case "error": {
        const errorMessage = event.data.message || "The agent encountered an internal error while processing your request.";
        const errContent = `\n\n**Error:** ${errorMessage}`;
        contentRef.current += errContent;
        onTextUpdate(contentRef.current);
        setState((s) => ({ ...s, error: errorMessage }));
        break;
      }

      case "complete":
        if (event.data.name && onSessionName) {
          onSessionName(event.data.name);
        }
        break;

      case "heartbeat":
      case "reasoning":
        break;
    }
  }

  const sendMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      onTextUpdate: (text: string) => void,
      onComplete: (finalMessage: AgentMessage) => void,
      options?: { autoExecute?: boolean; onSessionName?: (name: string) => void },
    ) => {
      abortRef.current = new AbortController();
      contentRef.current = "";

      const toolsUsed: string[] = [];
      const outputFiles: FileOutput[] = [];
      let currentAgent: string | null = null;
      let chartData: ChartData | null = null;

      setState({
        isStreaming: true,
        currentAgent: null,
        toolsUsed: [],
        outputFiles: [],
        error: null,
        sessionBusy: false,
      });

      try {
        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            message,
            accept_edit: options?.autoExecute ?? true,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 409) {
            setState((s) => ({ ...s, isStreaming: false, error: null, sessionBusy: true }));
            onComplete({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "**Session busy** — This session is still processing a previous message. Please wait a moment and try again.",
            });
            return;
          }
          const displayError = res.status === 502
            ? "Cannot reach the backend server. Please verify it is running."
            : errText || `The server responded with an error (status ${res.status})`;
          setState((s) => ({ ...s, isStreaming: false, error: displayError }));
          onComplete({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `**Error:** ${displayError}`,
          });
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setState((s) => ({ ...s, isStreaming: false }));
          onComplete({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "**Error:** No response stream available",
          });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let eventType = "";
        let dataLines: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            } else if (line === "") {
              if (eventType && dataLines.length > 0) {
                try {
                  const parsed: SSEEvent = {
                    event: eventType as SSEEvent["event"],
                    data: JSON.parse(dataLines.join("\n")),
                  };
                  processEvent(
                    parsed,
                    onTextUpdate,
                    toolsUsed,
                    outputFiles,
                    (agent) => {
                      currentAgent = agent;
                      setState((s) => ({ ...s, currentAgent: agent }));
                    },
                    (data) => {
                      chartData = data;
                    },
                    options?.onSessionName,
                  );
                } catch {
                  // Skip malformed events
                }
              }
              eventType = "";
              dataLines = [];
            }
          }
        }

        onComplete({
          id: crypto.randomUUID(),
          role: "assistant",
          content: contentRef.current,
          agentSlug: currentAgent || undefined,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
          outputFiles: outputFiles.length > 0 ? outputFiles : undefined,
          chartData: chartData || undefined,
        });
      } catch (err: any) {
        if (err.name === "AbortError") {
          onComplete({
            id: crypto.randomUUID(),
            role: "assistant",
            content: contentRef.current || "*Stopped*",
            agentSlug: currentAgent || undefined,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
            outputFiles: outputFiles.length > 0 ? outputFiles : undefined,
            chartData: chartData || undefined,
          });
        } else {
          let errMsg: string;
          if (err.name === "TypeError" && /fetch|network/i.test(err.message)) {
            errMsg = "Lost connection to the server. Check your internet connection and verify the backend is running.";
          } else if (err.message) {
            errMsg = err.message;
          } else {
            errMsg = "An unexpected error occurred while processing the agent response.";
          }

          const content = contentRef.current
            ? `${contentRef.current}\n\n**Error:** ${errMsg}`
            : `**Error:** ${errMsg}`;

          onComplete({
            id: crypto.randomUUID(),
            role: "assistant",
            content,
            agentSlug: currentAgent || undefined,
            toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
            outputFiles: outputFiles.length > 0 ? outputFiles : undefined,
            chartData: chartData || undefined,
          });
          setState((s) => ({
            ...s,
            error: errMsg,
          }));
        }
      } finally {
        setState((s) => ({ ...s, isStreaming: false }));
      }
    },
    [],
  );



  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    ...state,
    sendMessage,
    abort,
  };
}
