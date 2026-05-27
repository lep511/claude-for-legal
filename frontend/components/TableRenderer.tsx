"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExtractedTable } from "@/utils/extractTables";

export function TableRenderer({ table }: { table: ExtractedTable }) {
  return (
    <Card className="w-full h-full flex flex-col">
      {table.title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{table.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 overflow-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {table.markdown}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
