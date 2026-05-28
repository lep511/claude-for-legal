"use client";

import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Skill {
  name: string;
  description: string;
  argument_hint: string;
}

interface SkillPanelProps {
  agentSlug: string | null;
  onInvokeSkill: (skillName: string) => void;
}

export function SkillPanel({ agentSlug, onInvokeSkill }: SkillPanelProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentSlug) {
      setSkills([]);
      return;
    }
    setLoading(true);
    fetch(`/api/agents/${agentSlug}/skills`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSkills)
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [agentSlug]);

  if (!agentSlug || skills.length === 0) return null;

  return (
    <div className="border-t pt-2 mt-2">
      <p className="text-xs font-medium text-muted-foreground px-1 mb-1.5">
        Available workflows
      </p>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Button
            key={skill.name}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onInvokeSkill(skill.name)}
            title={skill.description}
          >
            <Zap className="h-3 w-3" />
            {skill.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
