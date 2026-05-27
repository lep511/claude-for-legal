"use client";

import React, { useRef, useState } from "react";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/ChartRenderer";
import { toast } from "@/hooks/use-toast";
import type { ChartData } from "@/types/chart";

class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "An unknown error occurred" };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-red-500">Error rendering chart: {this.state.error}</div>
      );
    }
    return this.props.children;
  }
}

export function SafeChartRenderer({ data }: { data: ChartData }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `${data.config.title?.replace(/[^a-zA-Z0-9]/g, "-") || "chart"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast({ title: "Error", description: "Failed to save chart as image" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ChartErrorBoundary>
      <div className="w-full h-full p-6 flex flex-col relative group">
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleDownload}
          disabled={saving}
          title="Save as PNG"
        >
          <Download className="h-4 w-4" />
        </Button>
        <div ref={chartRef} className="w-[90%] flex-1 mx-auto bg-background rounded-lg p-4">
          <ChartRenderer data={data} />
        </div>
      </div>
    </ChartErrorBoundary>
  );
}
