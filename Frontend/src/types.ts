/* ── Shared TypeScript types for Sync AI ─────────────────── */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

/**
 * Re-export API-layer types so components can import from
 * either "@/types" or "@/lib/api" without duplication.
 */
export type {
  ChatResponse,
  UploadResponse,
  SessionHistoryMessage,
  SessionHistoryResponse,
  GoogleUser,
  GoogleAuthResponse,
  SessionSummary,
} from "@/lib/api";
