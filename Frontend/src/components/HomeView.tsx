"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Code,
  Database,
  PenTool,
  Palette,
  Sparkles,
  FileText,
  Globe,
} from "lucide-react";
import ChatInput from "./ChatInput";

const SUGGESTIONS = [
  {
    label: "Latest news",
    icon: FileText,
    prompt: "What are the latest news today in India ?",
  },
  {
    label: "Write some code",
    icon: Code,
    prompt: "Write a Python script that scrapes news headlines using BeautifulSoup",
  },
  {
    label: "Search the web",
    icon: Globe,
    prompt: "What are the latest developments in AI this week?",
  },
  {
    label: "Data Analysis",
    icon: Database,
    prompt: "Give SQL queries for data analysis",
  },
];

interface HomeViewProps {
  onSend: (message: string) => void;
  onUploadPdf?: (file: File) => void;
  isLoggedIn: boolean;
}

export default function HomeView({ onSend, onUploadPdf, isLoggedIn }: HomeViewProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* Background glow orb */}
      <div className="glow-orb" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-2xl px-6 pb-28 md:pb-36 text-center space-y-4 md:space-y-6 z-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.15em] font-bold"
          style={{
            background: "var(--color-surface-chip)",
            border: "1px solid var(--color-border-secondary)",
            color: "var(--color-text-badge)",
          }}
        >
          <Sparkles size={12} className="text-indigo-400" />
          RAG · Web Search · Memory
        </motion.div>

        {/* Heading */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] text-center">
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to bottom, var(--gradient-heading-from), var(--gradient-heading-to))",
            }}
          >
            What can{" "}
          </span>
          <span
            className="font-sync-ai font-semibold tracking-tight bg-clip-text text-transparent inline-block transform translate-y-[-2px] mx-1"
            style={{
              backgroundImage: "linear-gradient(to right, var(--gradient-brand-from), var(--gradient-brand-to))",
            }}
          >
            Sync AI
          </span>
          <span
            className="bg-clip-text text-transparent block sm:inline"
            style={{
              backgroundImage: "linear-gradient(to bottom, var(--gradient-heading-from), var(--gradient-heading-to))",
            }}
          >
            {" "}help you with?
          </span>
        </h1>

        {/* Purpose description — only shown for logged-out users (required for Google OAuth branding verification) */}
        {!isLoggedIn && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-base md:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Sync AI is an AI-powered assistant that helps you search the web,
            write code, and get answers — all in one place
            with persistent memory across conversations.
          </motion.p>
        )}

        {/* Chat Input */}
        <ChatInput onSend={onSend} onUploadPdf={onUploadPdf} variant="home" isDisabled={!isLoggedIn} />

        {/* Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-2.5 pt-1 md:pt-2">
          {SUGGESTIONS.map((item, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.08 }}
              disabled={!isLoggedIn}
              onClick={() => onSend(item.prompt)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-surface-chip)",
                border: "1px solid var(--color-chip-border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-chip-hover)";
                e.currentTarget.style.borderColor = "var(--color-chip-border-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-surface-chip)";
                e.currentTarget.style.borderColor = "var(--color-chip-border)";
              }}
            >
              <item.icon
                size={15}
                style={{ color: "var(--color-text-faint)" }}
                className="group-hover:text-indigo-400 transition-colors"
              />
              <span
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
