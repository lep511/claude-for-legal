"use client";

import React from "react";
import { Send, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FilePreview from "@/components/FilePreview";
import type { FileUpload } from "@/types/agent";

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAbort: () => void;
  onRemoveUpload: () => void;
  currentUpload: FileUpload | null;
  isStreaming: boolean;
  sessionBusy: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatInput({
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  onFileSelect,
  onAbort,
  onRemoveUpload,
  currentUpload,
  isStreaming,
  sessionBusy,
  isUploading,
  fileInputRef,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col space-y-2">
        {currentUpload && (
          <FilePreview
            file={currentUpload}
            onRemove={onRemoveUpload}
          />
        )}
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || sessionBusy || isUploading}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Textarea
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={isStreaming || sessionBusy ? "Type your next message..." : "Describe your legal task..."}
              className="min-h-[40px] h-[40px] sm:min-h-[44px] sm:h-[44px] resize-none pl-10 sm:pl-12 py-2.5 sm:py-3 flex items-center text-sm"
              rows={1}
            />
          </div>
          {isStreaming || sessionBusy ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onAbort}
              disabled={sessionBusy && !isStreaming}
              className="h-[40px] sm:h-[44px] px-3"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() && !currentUpload}
              className="h-[40px] sm:h-[44px] px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv,.docx,.xls,.xlsx,.md"
        onChange={onFileSelect}
      />
    </form>
  );
}
