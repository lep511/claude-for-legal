"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import TopNavBar from "@/components/TopNavBar";

interface ProfileField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  line: number;
}

interface ProfileSchema {
  title: string;
  slug: string;
  auto_generated?: boolean;
  fields: ProfileField[];
  sections?: {
    id: string;
    title: string;
    fields: ProfileField[];
  }[];
}

interface ProfileData {
  slug: string;
  status: string;
  schema: ProfileSchema;
  values: Record<string, string>;
}

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Ai ", "AI ")
    .replace("Ip ", "IP ");
}

export default function AgentProfilePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/agents/profiles/${params.slug}`)
      .then((r) => r.json())
      .then((d: ProfileData) => {
        setData(d);
        setValues(d.values || {});
      })
      .catch(() => toast({ title: "Error loading profile", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!params.slug) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/profiles/${params.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (res.ok) {
        toast({ title: "Profile saved" });
        setDirty(false);
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!params.slug) return;
    if (!confirm("Reset this profile to its template state? All values will be cleared.")) return;
    try {
      const res = await fetch(`/api/agents/profiles/${params.slug}`, {
        method: "POST",
      });
      if (res.ok) {
        setValues({});
        setDirty(false);
        toast({ title: "Profile reset" });
      }
    } catch {
      toast({ title: "Failed to reset", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <TopNavBar features={{}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-screen">
        <TopNavBar features={{}} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Agent not found</p>
        </div>
      </div>
    );
  }

  const fields = data.schema.sections
    ? data.schema.sections.flatMap((s) => s.fields)
    : data.schema.fields;

  const filledCount = fields.filter((f) => values[f.id]?.trim()).length;

  return (
    <div className="flex flex-col h-screen">
      <TopNavBar features={{}} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href="/legal/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">
                  {slugToDisplayName(params.slug)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {filledCount}/{fields.length} fields configured
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {data.schema.sections ? (
            data.schema.sections.map((section) => (
              <Card key={section.id} className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.fields.map((field) => (
                    <FieldInput
                      key={field.id}
                      field={field}
                      value={values[field.id] || ""}
                      onChange={handleChange}
                    />
                  ))}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 space-y-4">
                {fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={values[field.id] || ""}
                    onChange={handleChange}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (id: string, value: string) => void;
}) {
  const hasValue = value.trim().length > 0;

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          {field.label}
          {hasValue && <CheckCircle2 className="h-3 w-3 text-green-500" />}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          {field.label}
          {hasValue && <CheckCircle2 className="h-3 w-3 text-green-500" />}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[80px]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-2">
        {field.label}
        {hasValue && <CheckCircle2 className="h-3 w-3 text-green-500" />}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
