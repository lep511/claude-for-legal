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
  isClarification?: boolean;
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
  agents_used: string[];
  turns: any[];
  output_dir: string;
}

// SSE event types from the Python backend
export type SSEEventType =
  | "text"
  | "tool_start"
  | "tool_end"
  | "route"
  | "handoff"
  | "clarification"
  | "file_output"
  | "chart_data"
  | "heartbeat"
  | "complete"
  | "error"
  | "reasoning";

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, any>;
}
