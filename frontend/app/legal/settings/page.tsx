"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TopNavBar from "@/components/TopNavBar";

interface AgentProfile {
  slug: string;
  status: "configured" | "partial" | "unconfigured";
  total_fields: number;
  filled_fields: number;
}

const STATUS_CONFIG = {
  configured: {
    icon: CheckCircle2,
    label: "Configured",
    className: "text-green-600 dark:text-green-400",
    bgClassName: "bg-green-50 dark:bg-green-950/30",
  },
  partial: {
    icon: AlertCircle,
    label: "Partial",
    className: "text-yellow-600 dark:text-yellow-400",
    bgClassName: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  unconfigured: {
    icon: Circle,
    label: "Not configured",
    className: "text-muted-foreground",
    bgClassName: "bg-muted/50",
  },
};

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Ai ", "AI ")
    .replace("Ip ", "IP ");
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopNavBar features={{}} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/legal">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Agent Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure practice profiles for each legal agent
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const config = STATUS_CONFIG[profile.status];
                const Icon = config.icon;
                const progress =
                  profile.total_fields > 0
                    ? Math.round(
                        (profile.filled_fields / profile.total_fields) * 100
                      )
                    : 0;

                return (
                  <Link
                    key={profile.slug}
                    href={`/legal/settings/${profile.slug}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{slugToDisplayName(profile.slug)}</span>
                          <Icon className={`h-4 w-4 ${config.className}`} />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className={config.className}>
                            {config.label}
                          </span>
                          <span>
                            {profile.filled_fields}/{profile.total_fields} fields
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              profile.status === "configured"
                                ? "bg-green-500"
                                : profile.status === "partial"
                                  ? "bg-yellow-500"
                                  : "bg-muted-foreground/20"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
