"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { FormField } from "@/types/agent";

interface FieldInputProps {
  field: FormField;
  value: string;
  onChange: (id: string, value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function FieldInput({
  field,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: FieldInputProps) {
  const hasValue = value.trim().length > 0;
  const baseClasses =
    "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
  const borderClass = invalid ? "border-destructive" : "border-input";

  const Label = (
    <label className="text-sm font-medium flex items-center gap-2">
      {field.label}
      {field.required && <span className="text-destructive">*</span>}
      {hasValue && <CheckCircle2 className="h-3 w-3 text-green-500" />}
    </label>
  );

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        {Label}
        <select
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
          className={`${baseClasses} ${borderClass}`}
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
        {Label}
        <textarea
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={3}
          className={`${baseClasses} ${borderClass} resize-y min-h-[80px]`}
        />
      </div>
    );
  }

  const htmlType =
    field.type === "date" ? "date" : field.type === "number" ? "number" : "text";

  return (
    <div className="space-y-1.5">
      {Label}
      <input
        type={htmlType}
        value={value}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={`${baseClasses} ${borderClass}`}
      />
    </div>
  );
}
