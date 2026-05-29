"use client";

import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/FieldInput";
import type { FormRequest } from "@/types/agent";

interface ChatFormProps {
  formRequest: FormRequest;
  submitted: boolean;
  onSubmit: (values: Record<string, string>) => void;
}

export function ChatForm({ formRequest, submitted, onSubmit }: ChatFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setInvalid((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const missing = formRequest.fields
      .filter((f) => f.required && !values[f.id]?.trim())
      .map((f) => f.id);
    if (missing.length > 0) {
      setInvalid(new Set(missing));
      return;
    }
    setIsSubmitting(true);
    const labeledValues: Record<string, string> = {};
    for (const field of formRequest.fields) {
      if (values[field.id]?.trim()) {
        labeledValues[field.label] = values[field.id];
      }
    }
    onSubmit(labeledValues);
  };

  if (submitted) {
    const answered = formRequest.fields.filter((f) => values[f.id]?.trim());
    return (
      <div className="mt-2 rounded-md border bg-background/60 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-muted-foreground mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {formRequest.title} — enviado
        </div>
        {answered.length > 0 && (
          <dl className="space-y-1">
            {answered.map((f) => (
              <div key={f.id} className="flex gap-2">
                <dt className="font-medium shrink-0">{f.label}:</dt>
                <dd className="text-muted-foreground break-words">
                  {values[f.id]}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-md border bg-background/60 p-3 space-y-3"
    >
      <div>
        <h3 className="text-sm font-semibold">{formRequest.title}</h3>
        {formRequest.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formRequest.description}
          </p>
        )}
      </div>
      <div className="space-y-3">
        {formRequest.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id] || ""}
            onChange={handleChange}
            invalid={invalid.has(field.id)}
          />
        ))}
      </div>
      <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={isSubmitting}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        Enviar
      </Button>
    </form>
  );
}
