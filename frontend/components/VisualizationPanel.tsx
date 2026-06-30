"use client";

import React, { useEffect, useState } from "react";
import {
  ChartColumnBig,
  FileSpreadsheet,
  FileText,
  File,
  FileDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeChartRenderer } from "@/components/SafeChartRenderer";
import { TableRenderer } from "@/components/TableRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChartData } from "@/types/chart";
import type { ExtractedTable } from "@/utils/extractTables";

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv")
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (ext === "docx" || ext === "doc")
    return <FileText className="h-5 w-5 text-blue-600" />;
  if (ext === "pptx" || ext === "ppt")
    return <FileText className="h-5 w-5 text-orange-500" />;
  if (ext === "pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextPreviewable(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "md" || ext === "txt";
}

function MarkdownFileViewer({
  sessionId,
  filename,
}: {
  sessionId: string;
  filename: string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(filename)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [sessionId, filename]);

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load preview
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Loading preview...
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-y-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export type Visualization =
  | { type: "chart"; data: ChartData; messageIndex: number }
  | { type: "table"; data: ExtractedTable; messageIndex: number };

interface VisualizationPanelProps {
  visualizations: Visualization[];
  sessionFiles: { filename: string; size: number; path: string }[];
  sessionId: string | null;
  onChartScroll: () => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  chartEndRef: React.RefObject<HTMLDivElement | null>;
}

export function VisualizationPanel({
  visualizations,
  sessionFiles,
  sessionId,
  onChartScroll,
  contentRef,
  chartEndRef,
}: VisualizationPanelProps) {
  const previewableFiles = sessionFiles.filter((f) => isTextPreviewable(f.filename));
  const otherFiles = sessionFiles.filter((f) => !isTextPreviewable(f.filename));
  const hasContent = visualizations.length > 0 || sessionFiles.length > 0;

  return (
    <Card className="hidden lg:flex flex-1 flex-col h-full overflow-hidden">
      <CardHeader className="py-3 px-4 shrink-0">
        <CardTitle className="text-lg">
          {previewableFiles.length > 0 && visualizations.length === 0 && otherFiles.length === 0
            ? "Document Preview"
            : visualizations.length > 0 && sessionFiles.length > 0
              ? "Analysis & Files"
              : visualizations.length > 0
                ? "Analysis & Visualizations"
                : sessionFiles.length > 0
                  ? "Generated Files"
                  : "Output"}
        </CardTitle>
      </CardHeader>
      <CardContent
        ref={contentRef}
        className="flex-1 overflow-y-auto min-h-0"
        onScroll={onChartScroll}
      >
        {visualizations.length > 0 && (
          <div className="min-h-full flex flex-col snap-y snap-mandatory">
            {[...visualizations].reverse().map((viz, index) => (
              <div
                key={viz.type === "chart" ? `chart-${viz.messageIndex}` : `${viz.data.id}-${viz.messageIndex}`}
                className="w-full min-h-full flex-shrink-0 snap-start snap-always"
                ref={index === 0 ? chartEndRef : null}
              >
                {viz.type === "chart" ? (
                  <SafeChartRenderer data={viz.data} />
                ) : (
                  <TableRenderer table={viz.data} />
                )}
              </div>
            ))}
          </div>
        )}

        {previewableFiles.length > 0 && sessionId && (
          <div className={`space-y-4 ${visualizations.length > 0 ? "border-t pt-4 mt-4" : ""}`}>
            {previewableFiles.map((file) => (
              <div key={file.filename} className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}&format=docx`}
                      download={file.filename.replace(/\.md$/, ".docx")}
                      title="Descargar como Word"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Word
                    </a>
                    <a
                      href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}&format=xlsx`}
                      download={file.filename.replace(/\.md$/, ".xlsx")}
                      title="Descargar como Excel"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Excel
                    </a>
                    <a
                      href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}`}
                      download={file.filename}
                      title="Descargar Markdown"
                      className="inline-flex items-center p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileDown className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <MarkdownFileViewer sessionId={sessionId} filename={file.filename} />
              </div>
            ))}
          </div>
        )}

        {otherFiles.length > 0 && (
          <div className={`space-y-2 p-2 ${visualizations.length > 0 || previewableFiles.length > 0 ? "border-t pt-4 mt-4" : ""}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Generated Files
            </p>
            {otherFiles.map((file) => (
              <a
                key={file.filename}
                href={`/api/agents/sessions/${sessionId}/files/download?name=${encodeURIComponent(file.filename)}`}
                download={file.filename}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                {getFileIcon(file.filename)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary">
                    {file.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <FileDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        {!hasContent && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center justify-center gap-4 -translate-y-8">
              <ChartColumnBig className="w-8 h-8 text-muted-foreground" />
              <div className="space-y-2">
                <CardTitle className="text-lg">
                  Output & Deliverables
                </CardTitle>
                <CardDescription className="text-base">
                  Files and visualizations will appear here as agents work
                </CardDescription>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Badge variant="outline">Legal Memos</Badge>
                  <Badge variant="outline">Review Reports</Badge>
                  <Badge variant="outline">Excel Trackers</Badge>
                  <Badge variant="outline">Charts</Badge>
                  <Badge variant="outline">Tables</Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
