"use client";

import React from "react";
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
  return (
    <Card className="hidden lg:flex flex-1 flex-col h-full overflow-hidden">
      <CardHeader className="py-3 px-4 shrink-0">
        <CardTitle className="text-lg">
          {visualizations.length > 0 && sessionFiles.length > 0
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

        {sessionFiles.length > 0 && (
          <div className={`space-y-2 p-2 ${visualizations.length > 0 ? "border-t pt-4 mt-4" : ""}`}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Generated Files
            </p>
            {sessionFiles.map((file) => (
              <a
                key={file.filename}
                href={`/api/agents/sessions/${sessionId}/files/${file.filename}`}
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

        {visualizations.length === 0 && sessionFiles.length === 0 && (
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
                  <Badge variant="outline">Excel Models</Badge>
                  <Badge variant="outline">Word Reports</Badge>
                  <Badge variant="outline">Pitch Decks</Badge>
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
