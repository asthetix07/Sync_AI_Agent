"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import type { ChatSession, Message } from "@/types";
import { sendMessage, uploadPdf, listSessions, getSessionHistory, deleteSession, getMe, logoutUser } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import HomeView from "@/components/HomeView";
import ChatView from "@/components/ChatView";
import SignupDialog from "@/components/SignupDialog";

const AUTH_STORAGE_KEY = "sync_ai_google_auth_user";

export default function ChatLayout() {
  const router = useRouter();
  const params = useParams();
  const sessionIdFromUrl = params?.sessionId as string | undefined;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionIdFromUrl ?? null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string | null, email: string, profile_url?: string | null} | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Ref to track the current AbortController for in-flight chat requests
  const chatAbortRef = useRef<AbortController | null>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // ── Sync currentSessionId when URL param changes ────────
  useEffect(() => {
    if (sessionIdFromUrl && sessionIdFromUrl !== currentSessionId) {
      setCurrentSessionId(sessionIdFromUrl);
    } else if (!sessionIdFromUrl && currentSessionId) {
      // URL is /chat (no sessionId) — clear current session
      setCurrentSessionId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdFromUrl]);

  // ── Verify auth state on mount via httpOnly cookie ─────────
  useEffect(() => {
    const controller = new AbortController();

    async function checkAuth() {
      try {
        // Verify the httpOnly cookie by hitting /auth/me
        const me = await getMe(controller.signal);
        if (me) {
          setIsLoggedIn(true);
          setUserProfile({ name: me.name, email: me.email, profile_url: me.profile_url });
          // Keep localStorage in sync for profile display (no tokens stored)
          window.localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              name: me.name,
              email: me.email,
              profile_url: me.profile_url,
            })
          );
        } else {
          // Cookie missing or expired — check localStorage fallback
          setIsLoggedIn(false);
          setUserProfile(null);
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          setShowLoginDialog(true);
        }
      } catch {
        setIsLoggedIn(false);
        setShowLoginDialog(true);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();

    return () => controller.abort();
  }, []);

  // ── Hydrate sessions from backend on mount (with AbortController) ─
  useEffect(() => {
    // Only hydrate sessions if the user is authenticated
    if (!isLoggedIn || isCheckingAuth) return;

    const controller = new AbortController();

    async function hydrate() {
      try {
        const summaries = await listSessions(controller.signal);
        if (summaries.length === 0) return;

        // Fetch full history for each session
        const hydrated = await Promise.all(
          summaries.map(async (s) => {
            try {
              const history = await getSessionHistory(s.session_id, controller.signal);
              const messages: Message[] = history.messages.map((m, i) => ({
                id: `${s.session_id}-${i}`,
                role: m.role === "human" ? "user" : "assistant",
                content: m.content,
                timestamp: Date.now() - (history.messages.length - i) * 1000,
              }));
              // Use first user message as title, or fallback
              const firstUser = messages.find((m) => m.role === "user");
              const title = firstUser
                ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "")
                : `Session ${s.session_id.slice(0, 8)}…`;
              return {
                id: s.session_id,
                title,
                messages,
                updatedAt: Date.now(),
              };
            } catch {
              // If a session fails to load, skip it
              return null;
            }
          })
        );
        const valid = hydrated.filter(Boolean) as ChatSession[];
        if (valid.length > 0) {
          setSessions(valid);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (process.env.NODE_ENV === "development") {
          console.warn("Could not hydrate sessions from backend:", err);
        }
      }
    }
    hydrate();

    return () => controller.abort();
  }, [isLoggedIn, isCheckingAuth]);

  /* ── Start a new blank chat ─────────────────────────────── */
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    router.push("/chat");
  }, [router]);

  /* ── Select an existing session ─────────────────────────── */
  const handleSelectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    router.push(`/chat/${id}`);
  }, [router]);

  /* ── Delete a session from the sidebar ──────────────────── */
  const handleDeleteSession = useCallback(
    async (id: string) => {
      // Remove from React state immediately for responsiveness
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        router.push("/chat");
      }

      // Also delete from backend (chat history + vectors)
      try {
        await deleteSession(id);
      } catch (err: unknown) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to delete session from backend:", err);
        }
      }
    },
    [currentSessionId, router]
  );

  /* ── Logout handler ─────────────────────────────────────── */
  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("Logout request failed:", err);
      }
    }
    // Clear local state regardless of backend response
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    setUserProfile(null);
    setSessions([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
    setShowLoginDialog(true);
    router.push("/");
  }, [router]);

  /* ── Send a chat message ────────────────────────────────── */
  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      let session = currentSession;

      // If no active session, create one
      if (!session) {
        const newSession: ChatSession = {
          id: uuidv4(),
          title: content.slice(0, 40) + (content.length > 40 ? "…" : ""),
          messages: [userMsg],
          updatedAt: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        session = newSession;
        // Update URL to the new session
        router.push(`/chat/${newSession.id}`);
      } else {
        const sessionId = session.id;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() }
              : s
          )
        );
      }

      setIsLoading(true);

      // Abort any previous in-flight chat request
      chatAbortRef.current?.abort();
      const controller = new AbortController();
      chatAbortRef.current = controller;

      const sessionId = session.id;
      const aiMsgId = uuidv4();
      let streamContent = "";

      try {
        await sendMessage(
          sessionId,
          content,
          (chunk) => {
            streamContent += chunk;
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id !== sessionId) return s;

                // Find if the assistant message already exists
                const existingMsgIdx = s.messages.findIndex((m) => m.id === aiMsgId);
                if (existingMsgIdx > -1) {
                  const updatedMessages = [...s.messages];
                  updatedMessages[existingMsgIdx] = {
                    ...updatedMessages[existingMsgIdx],
                    content: streamContent,
                  };
                  return { ...s, messages: updatedMessages, updatedAt: Date.now() };
                } else {
                  const aiMsg: Message = {
                    id: aiMsgId,
                    role: "assistant",
                    content: streamContent,
                    timestamp: Date.now(),
                  };
                  return { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() };
                }
              })
            );
          },
          controller.signal
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (process.env.NODE_ENV === "development") {
          console.error("Chat error:", err);
        }
        
        const errMsgText = "\n\n*[Connection error - lost contact with server]*";
        
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s;
            const existingMsgIdx = s.messages.findIndex((m) => m.id === aiMsgId);
            if (existingMsgIdx > -1) {
              const updatedMessages = [...s.messages];
              updatedMessages[existingMsgIdx] = {
                ...updatedMessages[existingMsgIdx],
                content: updatedMessages[existingMsgIdx].content + errMsgText,
              };
              return { ...s, messages: updatedMessages, updatedAt: Date.now() };
            } else {
              const errMsg: Message = {
                id: uuidv4(),
                role: "assistant",
                content:
                  "Sorry, I encountered an error connecting to the server. Please ensure the backend is running and try again.",
                timestamp: Date.now(),
              };
              return { ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() };
            }
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession, router]
  );

  /* ── Stop generating (abort in-flight request) ─────────── */
  const handleStop = useCallback(() => {
    chatAbortRef.current?.abort();
    setIsLoading(false);
  }, []);

  /* ── Regenerate the last assistant response ─────────────── */
  const handleRegenerate = useCallback(() => {
    if (!currentSession || currentSession.messages.length === 0) return;
    const lastUser = [...currentSession.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser) return;

    // Remove last assistant message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? { ...s, messages: s.messages.slice(0, -1) }
          : s
      )
    );
    handleSendMessage(lastUser.content);
  }, [currentSession, handleSendMessage]);

  /* ── Upload a PDF ───────────────────────────────────────── */
  const handleUploadPdf = useCallback(
    async (file: File) => {
      let sessionId = currentSessionId;

      // Create a session for the upload if none exists
      if (!sessionId) {
        const newSession: ChatSession = {
          id: uuidv4(),
          title: `📄 ${file.name}`,
          messages: [],
          updatedAt: Date.now(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        sessionId = newSession.id;
        // Update URL to the new session
        router.push(`/chat/${newSession.id}`);
      }

      setIsLoading(true);
      try {
        const data = await uploadPdf(sessionId, file);
        const sysMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: `✅ **${data.filename}** uploaded successfully — ${data.chunks_stored} chunks indexed.\n\nYou can now ask questions about this document.`,
          timestamp: Date.now(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, sysMsg], updatedAt: Date.now() }
              : s
          )
        );
      } catch (err: unknown) {
        if (process.env.NODE_ENV === "development") {
          console.error("Upload error:", err);
        }
        const errMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: "❌ Failed to upload the PDF. Please check the backend and try again.",
          timestamp: Date.now(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }
              : s
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, router]
  );

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!currentSessionId ? (
          <HomeView onSend={handleSendMessage} onUploadPdf={handleUploadPdf} isLoggedIn={isLoggedIn} />
        ) : (
          <ChatView
            messages={currentSession?.messages || []}
            isLoading={isLoading}
            onSend={handleSendMessage}
            onStop={handleStop}
            onRegenerate={handleRegenerate}
            onUploadPdf={handleUploadPdf}
            isLoggedIn={isLoggedIn}
          />
        )}
        {!isLoggedIn && !showLoginDialog && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-40">
            <button
              onClick={() => setShowLoginDialog(true)}
              className="px-6 py-3 rounded-full font-semibold shadow-lg transition-colors cursor-pointer"
              style={{ background: 'var(--login-btn-bg)', color: 'var(--login-btn-text)' }}
            >
              Login to <span className="font-sync-ai font-bold">Sync AI</span>
            </button>
          </div>
        )}
      </main>

      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen}
        onToggle={() => {
          if (isLoggedIn) setIsSidebarOpen((p) => !p);
        }}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
        userProfile={userProfile}
      />

      <SignupDialog 
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onSuccess={() => {
          setIsLoggedIn(true);
          // Redirect to /chat after successful login
          router.push("/chat");
          // Reload to re-run auth check and hydrate sessions
          window.location.href = "/chat";
        }}
      />
    </div>
  );
}
