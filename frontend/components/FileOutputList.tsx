"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileOutput } from "@/types/agent";

interface FileOutputListProps {
  sessionId: string;
  files: FileOutput[];
}

export function FileOutputList({ sessionId, files }: FileOutputListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs text-muted-foreground font-medium">
        Generated files:
      </p>
      {files.map((file) => (
        <a
          key={file.filename}
          href={`/api/agents/sessions/${sessionId}/files/${file.filename}`}
          download={file.filename}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 px-2"
          >
            <FileDown className="h-3.5 w-3.5" />
            {file.filename}
          </Button>
        </a>
      ))}
    </div>
  );
}
