import type { ChartData } from "./chart";
import type { ExtractedTable } from "@/utils/extractTables";

export interface AgentInfo {
  slug: string;
  description: string;
}

export interface FileOutput {
  filename: string;
  path: string;
  size?: number;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentSlug?: string;
  toolsUsed?: string[];
  isStreaming?: boolean;
  chartData?: ChartData;
  outputFiles?: FileOutput[];
  formRequest?: FormRequest;
  formSubmitted?: boolean;
}

// In-chat form requested by an agent via the request_user_input tool
export type FormFieldType = "text" | "textarea" | "select" | "date" | "number";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface FormRequest {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FileUpload {
  base64: string;
  fileName: string;
  mediaType: string;
  isText?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentSlug?: string;
  toolsUsed?: string[];
  isStreaming?: boolean;
  outputFiles?: FileOutput[];
  file?: FileUpload;
  chartData?: ChartData;
  tableData?: ExtractedTable[];
  formRequest?: FormRequest;
  formSubmitted?: boolean;
}

export interface SessionInfo {
  session_id: string;
  created_at: string;
  name: string | null;
  agents_used: string[];
  turns: number;
}

export interface SessionDetail {
  session_id: string;
  created_at: string;
  name: string | null;
  agents_used: string[];
  turns: any[];
  output_dir: string;
  charts?: ChartData[];
}

// SSE event types from the Python backend
export type SSEEventType =
  | "text"
  | "tool_start"
  | "tool_end"
  | "route"
  | "handoff"
  | "file_output"
  | "chart_data"
  | "form_request"
  | "heartbeat"
  | "complete"
  | "error"
  | "reasoning";

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, any>;
}
