"use client";

import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileOutput } from "@/types/agent";

interface FileOutputListProps {
  sessionId: string;
  files: FileOutput[];
}

export function FileOutputList({ sessionId, files }: FileOutputListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">
        Archivos generados:
      </p>
      {files.map((file) => {
        const isMd = file.filename.endsWith(".md") || file.filename.endsWith(".txt");
        return (
          <div key={file.filename} className="flex items-center gap-1 flex-wrap">
            <a
              href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}`}
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
            {isMd && (
              <>
                <a
                  href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}&format=docx`}
                  download={file.filename.replace(/\.(md|txt)$/, ".docx")}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1 px-2 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  >
                    <FileText className="h-3 w-3" />
                    Word
                  </Button>
                </a>
                <a
                  href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}&format=xlsx`}
                  download={file.filename.replace(/\.(md|txt)$/, ".xlsx")}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs gap-1 px-2 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    Excel
                  </Button>
                </a>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
