"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChartArea, FileInput, MessageCircleQuestion } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FilePreview from "@/components/FilePreview";
import { AgentBadge } from "@/components/AgentBadge";
import { FileOutputList } from "@/components/FileOutputList";
import { ChatForm } from "@/components/ChatForm";
import { cleanAgentContent } from "@/utils/cleanAgentContent";
import type { Message } from "@/types/agent";

function MessageComponent({
  message,
  sessionId,
  onFormSubmit,
}: {
  message: Message;
  sessionId: string | null;
  onFormSubmit: (messageId: string, values: Record<string, string>) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      {message.role === "assistant" && (
        <Avatar className="w-8 h-8 border">
          <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      <div
        className={`flex flex-col max-w-[85%] ${
          message.role === "user" ? "ml-auto" : ""
        }`}
      >
        <div
          className={`p-3 rounded-md text-sm ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted border"
          }`}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-[6px] px-1 py-2">
              <span className="h-[9px] w-[9px] rounded-full bg-foreground/60 animate-dot-typing-1" />
              <span className="h-[9px] w-[9px] rounded-full bg-foreground/60 animate-dot-typing-2" />
              <span className="h-[9px] w-[9px] rounded-full bg-foreground/60 animate-dot-typing-3" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {message.agentSlug && (
                <AgentBadge
                  slug={message.agentSlug}
                  toolsUsed={message.toolsUsed}
                />
              )}
              {message.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanAgentContent(message.content, !!(message.chartData || message.tableData))}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{message.content}</span>
              )}
              {message.isStreaming && (
                <span className="inline-flex items-center gap-[5px] mt-1">
                  <span className="h-[7px] w-[7px] rounded-full bg-foreground/50 animate-dot-typing-1" />
                  <span className="h-[7px] w-[7px] rounded-full bg-foreground/50 animate-dot-typing-2" />
                  <span className="h-[7px] w-[7px] rounded-full bg-foreground/50 animate-dot-typing-3" />
                </span>
              )}
              {message.formRequest && (
                <ChatForm
                  formRequest={message.formRequest}
                  submitted={!!message.formSubmitted}
                  onSubmit={(values) => onFormSubmit(message.id, values)}
                />
              )}
            </div>
          )}
        </div>
        {message.file && (
          <div className="mt-1.5">
            <FilePreview file={message.file} size="small" />
          </div>
        )}
        {message.outputFiles && sessionId && (
          <FileOutputList sessionId={sessionId} files={message.outputFiles} />
        )}
      </div>
    </div>
  );
}

interface ChatMessageListProps {
  messages: Message[];
  sessionId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFormSubmit: (messageId: string, values: Record<string, string>) => void;
}

export function ChatMessageList({
  messages,
  sessionId,
  messagesEndRef,
  onFormSubmit,
}: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in-up max-w-[95%] mx-auto">
        <Avatar className="w-10 h-10 mb-4 border">
          <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
        </Avatar>
        <h2 className="text-lg sm:text-xl font-semibold mb-2">
          Legal Agents
        </h2>
        <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
          <div className="flex items-center gap-2 sm:gap-3">
            <ChartArea className="text-muted-foreground w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <p className="text-muted-foreground">
              12 specialized agents for legal analysis, review, and
              compliance.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <FileInput className="text-muted-foreground w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <p className="text-muted-foreground">
              Upload documents and the right agent will process them.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <MessageCircleQuestion className="text-muted-foreground w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <p className="text-muted-foreground">
              Describe your task — the orchestrator routes it
              automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 min-h-full">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`animate-fade-in-up ${
            message.isStreaming && !message.content
              ? "animate-pulse"
              : ""
          }`}
        >
          <MessageComponent
            message={message}
            sessionId={sessionId}
            onFormSubmit={onFormSubmit}
          />
        </div>
      ))}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
