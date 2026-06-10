"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  ChevronRight,
  Menu,
  LogOut,
  Trash2,
  Sun,
  Moon,
} from "lucide-react";
import type { ChatSession } from "@/types";
import { useTheme } from "./ThemeProvider";

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  userProfile?: { name: string | null; email: string; profile_url?: string | null } | null;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLogout,
  isLoggedIn,
  userProfile,
}: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 272 : 68 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-screen overflow-hidden shrink-0"
      style={{
        background: "var(--color-bg-secondary)",
        borderLeft: "1px solid var(--color-border-primary)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 h-16">
        <button
          id="sidebar-toggle"
          onClick={isLoggedIn ? onToggle : undefined}
          disabled={!isLoggedIn}
          className={`p-2 rounded-lg transition-colors ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ color: "var(--color-text-primary)" }}
        >
          {isOpen ? <ChevronRight size={20} /> : <Menu size={20} />}
        </button>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-sync-ai font-semibold text-lg tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, var(--gradient-brand-from), var(--gradient-brand-to))",
            }}
          >
            Sync AI
          </motion.span>
        )}
      </div>

      {/* ── New Chat Button ─────────────────────────────────── */}
      {isOpen && (
        <div className="px-3 mb-4">
          <button
            id="new-chat-btn"
            onClick={onNewChat}
            className="flex items-center gap-3 w-full p-3 rounded-xl transition-all group cursor-pointer"
            style={{
              border: "1px solid var(--color-border-secondary)",
              color: "var(--color-text-primary)",
            }}
          >
            <Plus
              size={20}
              className="group-hover:text-indigo-400 transition-colors"
              style={{ color: "var(--color-text-tertiary)" }}
            />
            <span
              className="text-sm font-medium transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
            >
              New Chat
            </span>
          </button>
        </div>
      )}

      {/* ── Sessions List ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {isOpen && (
          <>
            {sessions.length === 0 && (
              <p
                className="text-xs text-center mt-8 px-4"
                style={{ color: "var(--color-text-ghost)" }}
              >
                No conversations yet. Start a new chat!
              </p>
            )}
            {sessions.map((session) => (
              <div key={session.id} className="group relative">
                <button
                  onClick={() => onSelectSession(session.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left cursor-pointer"
                  style={
                    currentSessionId === session.id
                      ? {
                          background: "var(--color-active-bg)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border-primary)",
                        }
                      : {
                          color: "var(--color-text-tertiary)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <MessageSquare size={18} className="shrink-0" />
                  <span className="text-sm truncate font-medium flex-1">
                    {session.title || "Untitled Chat"}
                  </span>
                </button>

                {/* Delete button (shown on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(session.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:!text-red-400"
                  style={{ color: "var(--color-text-ghost)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Footer / User Profile ───────────────────────────── */}
      <div
        className="p-3 space-y-2"
        style={{ borderTop: "1px solid var(--color-border-primary)" }}
      >
        {isOpen && (
          <div
            className="flex flex-col rounded-xl transition-all"
            style={
              isSettingsOpen
                ? {
                    border: "1px solid var(--color-border-primary)",
                    background: "var(--color-bg-tertiary)",
                  }
                : {}
            }
          >
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {/* ── Theme toggle button ─────────────────────── */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full p-3 transition-all text-sm cursor-pointer"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    <span>
                      {theme === "dark" ? "Change to light mode" : "Change to dark mode"}
                    </span>
                  </button>
                  <div
                    className="h-[1px] mx-3"
                    style={{ background: "var(--color-border-primary)" }}
                  />
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-3 w-full p-3 transition-all text-sm cursor-pointer"
                    style={{ color: "var(--color-red-text)" }}
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                  <div
                    className="h-[1px] mx-3"
                    style={{ background: "var(--color-border-primary)" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-3 w-full p-3 rounded-xl transition-all cursor-pointer"
              style={{ color: isSettingsOpen ? "var(--color-text-secondary)" : "var(--color-text-muted)" }}
            >
              <img
                src="/icons8-setting.svg"
                alt="Settings"
                className="w-[20px] h-[20px]"
                style={{ filter: "var(--color-settings-icon-filter)" }}
              />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        )}

        <div
          className={`flex items-center gap-3 w-full p-2 mt-2 rounded-xl ${
            !isOpen ? "justify-center p-2" : ""
          }`}
          style={{
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-surface-glass)",
          }}
        >
          {isLoggedIn && userProfile?.profile_url ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
              style={{ border: "1px solid var(--color-border-secondary)" }}
            >
              <img src={userProfile.profile_url} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/icons8-user.svg" alt="User" className="w-[18px] h-[18px]" />
            </div>
          )}
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {userProfile?.name || "User Account"}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--color-text-faint)" }}
              >
                {userProfile?.email || "Free Plan"}
              </p>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex justify-center gap-4 mt-2 px-2">
            <a
              href="/privacy_policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] transition-colors"
              style={{ color: "var(--color-text-faint)" }}
            >
              Privacy Policy
            </a>
            <a
              href="/terms_of_service"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] transition-colors"
              style={{ color: "var(--color-text-faint)" }}
            >
              Terms of Service
            </a>
          </div>
        )}
      </div>
    </motion.aside>

    {/* ── Logout Confirmation Dialog ─────────────────────── */}
    <AnimatePresence>
      {showLogoutConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "var(--color-overlay)" }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-[340px] rounded-2xl p-6 shadow-2xl"
            style={{
              border: "1px solid var(--color-border-secondary)",
              background: "var(--color-bg-elevated)",
            }}
          >
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              Log out?
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  border: "1px solid var(--color-border-secondary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Delete Chat Confirmation Dialog ─────────────────── */}
    <AnimatePresence>
      {deleteConfirmId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "var(--color-overlay)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-[340px] rounded-2xl p-6 shadow-2xl"
            style={{
              border: "1px solid var(--color-border-secondary)",
              background: "var(--color-bg-elevated)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={18} style={{ color: "var(--color-red-text)" }} />
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Delete chat?
              </h3>
            </div>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              This will permanently delete this conversation and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  border: "1px solid var(--color-border-secondary)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-sm font-medium text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
