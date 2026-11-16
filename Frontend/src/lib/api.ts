/**
 * API client — communicates with the FastAPI backend
 * via Next.js API route proxies (never directly).
 *
 * All requests include `credentials: "include"` so the browser
 * sends the httpOnly `access_token` cookie set by the backend.
 *
 * Auto-refresh: When any API call gets a 401, the client
 * automatically attempts a silent token refresh via /api/auth/refresh
 * before retrying the original request once. If refresh also fails,
 * the 401 propagates to the caller.
 *
 * Endpoints proxied:
 *   POST   /api/chat            → Send message, get AI response
 *   POST   /api/upload-pdf      → Upload PDF for RAG ingestion
 *   GET    /api/sessions        → List all sessions (for sidebar hydration)
 *   GET    /api/sessions/{id}   → Retrieve full chat history
 *   DELETE /api/sessions/{id}   → Clear session data
 *   POST   /api/auth/google     → Google OAuth verification
 *   POST   /api/auth/refresh    → Silent token refresh
 *   POST   /api/auth/logout     → Clear auth cookie (logout)
 *   GET    /api/auth/me         → Get current user from JWT cookie
 */

import { z } from "zod";

/* ── Zod schemas for runtime API response validation ───── */

const GoogleUserSchema = z.object({
  openid: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  profile_url: z.string().nullable(),
});

const GoogleAuthResponseSchema = z.object({
  status: z.literal("success"),
  user: GoogleUserSchema,
});

const ChatResponseSchema = z.object({
  session_id: z.string(),
  response: z.string(),
});

const UploadResponseSchema = z.object({
  session_id: z.string(),
  filename: z.string(),
  chunks_stored: z.number(),
});

const SessionSummarySchema = z.object({
  session_id: z.string(),
  message_count: z.number(),
});

const SessionHistoryMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const SessionHistoryResponseSchema = z.object({
  session_id: z.string(),
  messages: z.array(SessionHistoryMessageSchema),
});

const MeResponseSchema = z.object({
  openid: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  profile_url: z.string().nullable().optional(),
});

const ProfilePictureResponseSchema = z.object({
  status: z.string(),
  profile_url: z.string(),
});

/* ── Exported TypeScript types (inferred from Zod) ─────── */

export type GoogleUser = z.infer<typeof GoogleUserSchema>;
export type GoogleAuthResponse = z.infer<typeof GoogleAuthResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionHistoryMessage = z.infer<typeof SessionHistoryMessageSchema>;
export type SessionHistoryResponse = z.infer<typeof SessionHistoryResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type ProfilePictureResponse = z.infer<typeof ProfilePictureResponseSchema>;

/* ── Silent token refresh ──────────────────────────────── */

/** In-flight refresh promise — deduplicates concurrent 401 retries */
let _refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt a silent token refresh by calling the /auth/refresh proxy.
 * Returns true if successful (new access token cookie set), false otherwise.
 *
 * Deduplicates concurrent calls: if a refresh is already in flight,
 * all callers share the same promise.
 */
export async function refreshToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/* ── API functions ─────────────────────────────────────── */

/**
 * Verify a Google id_token via the Next.js API proxy.
 * On success the backend sets an httpOnly `access_token` cookie.
 */
export async function signUpWithGoogle(
  credential: string,
  state: string,
  signal?: AbortSignal
): Promise<GoogleAuthResponse> {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, state }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Authentication failed (${res.status})`);
  }
  const raw = await res.json();
  return GoogleAuthResponseSchema.parse(raw);
}

/**
 * Log the user out by clearing the httpOnly auth cookie.
 */
export async function logoutUser(signal?: AbortSignal): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Logout failed (${res.status})`);
  }
}

/**
 * Check if the current user is authenticated by verifying the JWT cookie.
 * Returns user info if authenticated, null if not.
 *
 * Automatically attempts a silent token refresh on 401 before giving up.
 */
export async function getMe(signal?: AbortSignal): Promise<MeResponse | null> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      signal,
    });

    if (res.ok) {
      const raw = await res.json();
      return MeResponseSchema.parse(raw);
    }

    // If 401, try silent refresh then retry once
    if (res.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const retryRes = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          signal,
        });
        if (retryRes.ok) {
          const raw = await retryRes.json();
          return MeResponseSchema.parse(raw);
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Send a chat message and stream the response chunk-by-chunk.
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });

  // Auto-refresh on 401 and retry
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retryRes = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message }),
        signal,
      });
      if (!retryRes.ok) {
        throw new Error(`Chat request failed (${retryRes.status})`);
      }
      const reader = retryRes.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
      }
      return;
    }
  }

  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk(chunk);
  }
}

/**
 * Upload a PDF file to be ingested into the RAG pipeline.
 */
export async function uploadPdf(
  sessionId: string,
  file: File,
  signal?: AbortSignal
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("file", file);

  const res = await fetch("/api/upload-pdf", {
    method: "POST",
    credentials: "include",
    body: formData,
    signal,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
  const raw = await res.json();
  return UploadResponseSchema.parse(raw);
}

/**
 * List all sessions from the backend (for sidebar hydration on page load).
 */
export async function listSessions(
  signal?: AbortSignal
): Promise<SessionSummary[]> {
  const res = await fetch("/api/sessions", {
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw new Error(`List sessions failed (${res.status})`);
  }
  const raw = await res.json();
  return z.array(SessionSummarySchema).parse(raw);
}

/**
 * Get the full chat history for a session from the backend.
 */
export async function getSessionHistory(
  sessionId: string,
  signal?: AbortSignal
): Promise<SessionHistoryResponse> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Session history failed (${res.status})`);
  }
  const raw = await res.json();
  return SessionHistoryResponseSchema.parse(raw);
}

/**
 * Delete a session and all its associated data (chat history + vectors).
 */
export async function deleteSession(
  sessionId: string,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Delete failed (${res.status})`);
  }
}

/**
 * Upload a new user profile picture.
 * The backend uploads it to Cloudinary and saves it in PostgreSQL
 * mapped to the user's openid as primary key.
 */
export async function uploadProfilePicture(
  file: File,
  signal?: AbortSignal
): Promise<ProfilePictureResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/auth/profile-picture", {
    method: "POST",
    credentials: "include",
    body: formData,
    signal,
  });

  // Auto-refresh on 401 and retry once
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retryRes = await fetch("/api/auth/profile-picture", {
        method: "POST",
        credentials: "include",
        body: formData,
        signal,
      });
      if (!retryRes.ok) {
        const errorData = await retryRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (${retryRes.status})`);
      }
      const raw = await retryRes.json();
      return ProfilePictureResponseSchema.parse(raw);
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed (${res.status})`);
  }

  const raw = await res.json();
  return ProfilePictureResponseSchema.parse(raw);
}
