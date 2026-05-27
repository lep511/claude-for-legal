"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, History, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { SessionInfo } from "@/types/agent";

function displayName(session: SessionInfo): string {
  return session.name || `Session-${session.session_id.slice(0, 6)}`;
}

function DeleteConfirmDialog({
  sessionName,
  onConfirm,
  onCancel,
}: {
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl border bg-card p-6 shadow-lg animate-fade-in-up">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/10 dark:bg-red-400/10">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">Delete session</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{sessionName}</span>?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex w-full gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SessionControlsProps {
  sessionId: string | null;
  sessionName: string | null;
  sessions: SessionInfo[];
  disabled?: boolean;
  chatEmpty?: boolean;
  onNewSession: () => void;
  onResumeSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onFetchSessions: () => void;
}

export function SessionControls({
  sessionId,
  sessionName,
  sessions,
  disabled = false,
  chatEmpty = false,
  onNewSession,
  onResumeSession,
  onDeleteSession,
  onFetchSessions,
}: SessionControlsProps) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const currentName = sessionName || `Session-${sessionId?.slice(0, 6) || ""}`;

  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      {sessionId && (
        <Badge
          variant="outline"
          className="text-[10px] sm:text-xs hidden sm:inline-flex max-w-[150px] truncate cursor-default"
          title={sessionName || `Session ${sessionId}`}
        >
          {currentName}
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3"
        onClick={onNewSession}
        disabled={disabled || chatEmpty}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New</span>
      </Button>

      <DropdownMenu
        open={open}
        onOpenChange={(o) => {
          if (disabled) return;
          setOpen(o);
          if (o) onFetchSessions();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 sm:h-8 gap-1 sm:gap-1.5 px-2 sm:px-3"
            disabled={disabled}
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {sessions.length === 0 ? (
            <DropdownMenuItem disabled>No sessions yet</DropdownMenuItem>
          ) : (
            sessions.slice(0, 10).map((s) => {
              const isActive = s.session_id === sessionId;
              const name = displayName(s);
              return (
                <DropdownMenuItem
                  key={s.session_id}
                  className={`group ${isActive ? "cursor-default" : ""}`}
                  onClick={() => {
                    if (isActive) return;
                    onResumeSession(s.session_id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm truncate" title={s.name || `Session ${s.session_id}`}>
                        {name}
                        {isActive && (
                          <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5">
                            Active
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                        {s.agents_used.length > 0 && ` · ${s.agents_used.join(", ")}`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        setDeleteTarget({ id: s.session_id, name: displayName(s) });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-600/10 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {deleteTarget && (
        <DeleteConfirmDialog
          sessionName={deleteTarget.name}
          onConfirm={() => {
            const wasActive = deleteTarget.id === sessionId;
            onDeleteSession(deleteTarget.id);
            setDeleteTarget(null);
            if (wasActive) onNewSession();
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
