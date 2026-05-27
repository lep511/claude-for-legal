"use client";

import { Badge } from "@/components/ui/badge";

interface AgentBadgeProps {
  slug: string;
  toolsUsed?: string[];
}

export function AgentBadge({ slug, toolsUsed }: AgentBadgeProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="text-xs font-mono">
        {slug}
      </Badge>
      {toolsUsed?.map((tool) => (
        <Badge key={tool} variant="outline" className="text-xs">
          {tool}
        </Badge>
      ))}
    </div>
  );
}
