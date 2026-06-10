"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  User,
  Bot,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  StopCircle,
} from "lucide-react";
import type { Message } from "@/types";
import ChatInput from "./ChatInput";
import { useTheme } from "./ThemeProvider";

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop?: () => void;
  onRegenerate?: () => void;
  onUploadPdf?: (file: File) => void;
  isLoggedIn: boolean;
}

/* ── Tiny copy-to-clipboard helper ──────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="transition-colors cursor-pointer"
      style={{ color: "var(--color-text-ghost)" }}
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function ChatView({
  messages,
  isLoading,
  onSend,
  onStop,
  onRegenerate,
  onUploadPdf,
  isLoggedIn,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  return (
    <div
      className="flex-1 flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="h-14 flex items-center justify-between px-6 backdrop-blur-md z-10 shrink-0"
        style={{
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--color-status-active)" }}
          />
          <span
            className="font-sync-ai text-[13px] font-medium tracking-wide"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sync AI · Active
          </span>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-6 pb-44"
      >
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-4 p-5 rounded-2xl"
              style={
                message.role === "assistant"
                  ? {
                      background: "var(--color-surface-glass)",
                      border: "1px solid var(--color-border-primary)",
                    }
                  : {}
              }
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                style={
                  message.role === "user"
                    ? { background: "var(--color-user-avatar-bg)" }
                    : {
                        backgroundImage: `linear-gradient(to bottom right, var(--color-bot-avatar-from), var(--color-bot-avatar-to))`,
                        border: "1px solid var(--color-border-secondary)",
                      }
                }
              >
                {message.role === "user" ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} style={{ color: "var(--color-text-tertiary)" }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  className={`prose max-w-none prose-p:leading-relaxed text-[15px] ${
                    theme === "dark" ? "prose-invert" : ""
                  }`}
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <ReactMarkdown
                    components={{
                      code({ className, children, ref, ...props }: React.ComponentPropsWithRef<"code"> & { className?: string }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");
                        const isInline = !match;

                        return !isInline && match ? (
                          <div
                            className="relative group rounded-xl overflow-hidden my-4"
                            style={{ border: "1px solid var(--color-border-primary)" }}
                          >
                            {/* Code header */}
                            <div
                              className="flex items-center justify-between px-4 py-2"
                              style={{
                                background: "var(--color-bg-code-header)",
                                borderBottom: "1px solid var(--color-border-subtle)",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Terminal
                                  size={12}
                                  style={{ color: "var(--color-text-faint)" }}
                                />
                                <span
                                  className="text-[10px] uppercase tracking-widest font-bold"
                                  style={{ color: "var(--color-text-faint)" }}
                                >
                                  {match[1]}
                                </span>
                              </div>
                              <CopyButton text={codeString} />
                            </div>
                            <SyntaxHighlighter
                              style={theme === "dark" ? vscDarkPlus : vs}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                background: "var(--color-bg-code)",
                                padding: "16px",
                                fontSize: "13px",
                              }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code
                            className={`${className || ""} px-1.5 py-0.5 rounded text-[13px]`}
                            style={{
                              background: "var(--color-active-bg)",
                              color: "var(--color-code-inline)",
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Action bar for assistant messages */}
                {message.role === "assistant" && (
                  <div
                    className="flex items-center gap-3 mt-4 pt-3"
                    style={{ borderTop: "1px solid var(--color-border-subtle)" }}
                  >
                    <button
                      className="transition-colors cursor-pointer"
                      style={{ color: "var(--color-text-ghost)" }}
                    >
                      <ThumbsUp size={15} />
                    </button>
                    <button
                      className="transition-colors cursor-pointer"
                      style={{ color: "var(--color-text-ghost)" }}
                    >
                      <ThumbsDown size={15} />
                    </button>
                    <div className="ml-auto">
                      <CopyButton text={message.content} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* ── Loading / Typing indicator ───────────────────── */}
          {isLoading && (!messages.length || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
            <div
              className="flex gap-4 p-5 rounded-2xl"
              style={{
                background: "var(--color-surface-glass)",
                border: "1px solid var(--color-border-primary)",
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-bot-avatar-from), var(--color-bot-avatar-to))`,
                  border: "1px solid var(--color-border-secondary)",
                }}
              >
                <Bot size={16} style={{ color: "var(--color-text-muted)" }} />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input Area ──────────────────────────────────────── */}
      <div
        className="mt-auto relative z-10 px-6 pb-6 pt-8 shrink-0"
        style={{
          background: `linear-gradient(to top, var(--gradient-input-from), var(--gradient-input-via), transparent)`,
        }}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Action button — stop or regenerate */}
          {isLoading ? (
            <div className="flex justify-center">
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "var(--color-hover-bg)",
                  border: "1px solid var(--color-border-secondary)",
                  color: "var(--color-text-primary)",
                }}
              >
                <StopCircle size={16} />
                Stop generating
              </button>
            </div>
          ) : (
            messages.length > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={onRegenerate}
                  disabled={!isLoggedIn}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--color-hover-bg)",
                    border: "1px solid var(--color-border-secondary)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <RotateCcw size={16} />
                  Regenerate
                </button>
              </div>
            )
          )}

          <ChatInput
            onSend={onSend}
            onUploadPdf={onUploadPdf}
            isLoading={isLoading}
            isDisabled={!isLoggedIn}
          />
        </div>
      </div>
    </div>
  );
}
