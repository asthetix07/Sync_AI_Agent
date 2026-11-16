"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sun,
  Moon,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Cpu,
  Sliders,
  User as UserIcon,
  Palette,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { uploadProfilePicture } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: {
    name: string | null;
    email: string;
    profile_url?: string | null;
  } | null;
  onProfileUpdated?: (newProfileUrl: string) => void;
}

type TabType = "profile" | "general" | "model";

export default function SettingsModal({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile picture state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Unfunctional settings state (placeholders)
  const [selectedModel, setSelectedModel] = useState("sync-ai-flash");
  const [effortLevel, setEffortLevel] = useState<"low" | "medium" | "high">("medium");

  // Handle close with state reset
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    setUploadSuccess(false);
    onClose();
  }, [onClose]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size exceeds the 5MB limit.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const res = await uploadProfilePicture(selectedFile);
      setUploadSuccess(true);
      setSelectedFile(null);
      if (onProfileUpdated) {
        onProfileUpdated(res.profile_url);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload photo";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const currentAvatarUrl = previewUrl || userProfile?.profile_url;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: "var(--color-overlay)" }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border-secondary)",
            }}
          >
            {/* ── Modal Header ───────────────────────────────── */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--color-border-primary)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--color-active-bg)",
                    border: "1px solid var(--color-border-primary)",
                  }}
                >
                  <img
                    src="/icons8-setting.svg"
                    alt="Settings"
                    className="w-4 h-4"
                    style={{ filter: "var(--color-settings-icon-filter)" }}
                  />
                </div>
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Settings
                  </h2>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/5"
                style={{ color: "var(--color-text-tertiary)" }}
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Modal Body with Sidebar Tabs ───────────────── */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Navigation Tabs */}
              <div
                className="flex md:flex-col border-b md:border-b-0 md:border-r p-3 gap-1 shrink-0 overflow-x-auto md:w-48"
                style={{
                  borderColor: "var(--color-border-primary)",
                  background: "var(--color-bg-tertiary)",
                }}
              >
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeTab === "profile" ? "shadow-xs" : ""
                  }`}
                  style={
                    activeTab === "profile"
                      ? {
                          background: "var(--color-active-bg)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border-secondary)",
                        }
                      : {
                          color: "var(--color-text-tertiary)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <UserIcon size={15} />
                  <span>Profile Picture</span>
                </button>

                <button
                  onClick={() => setActiveTab("general")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeTab === "general" ? "shadow-xs" : ""
                  }`}
                  style={
                    activeTab === "general"
                      ? {
                          background: "var(--color-active-bg)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border-secondary)",
                        }
                      : {
                          color: "var(--color-text-tertiary)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Palette size={15} />
                  <span>Theme & Display</span>
                </button>

                <button
                  onClick={() => setActiveTab("model")}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeTab === "model" ? "shadow-xs" : ""
                  }`}
                  style={
                    activeTab === "model"
                      ? {
                          background: "var(--color-active-bg)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border-secondary)",
                        }
                      : {
                          color: "var(--color-text-tertiary)",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Cpu size={15} />
                  <span>AI Model & Effort</span>
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* ── TAB 1: PROFILE PICTURE CHANGE ───────────── */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        Profile Picture
                      </h3>
                    </div>

                    {/* Avatar Display & Action */}
                    <div
                      className="p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5"
                      style={{
                        background: "var(--color-bg-tertiary)",
                        border: "1px solid var(--color-border-primary)",
                      }}
                    >
                      <div className="relative group">
                        <div
                          className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg"
                          style={{
                            border: "3px solid var(--color-border-secondary)",
                            background: "var(--color-active-bg)",
                          }}
                        >
                          {currentAvatarUrl ? (
                            <img
                              src={currentAvatarUrl}
                              alt="Avatar Preview"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                              <UserIcon size={36} className="text-white/80" />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer transition-transform hover:scale-105"
                          title="Choose photo"
                        >
                          <Camera size={14} />
                        </button>
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {userProfile?.name || "Account User"}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-text-faint)" }}
                          >
                            {userProfile?.email || "Signed in"}
                          </p>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                            style={{
                              background: "var(--color-hover-bg-strong)",
                              border: "1px solid var(--color-border-secondary)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            <Upload size={13} />
                            <span>Select Photo</span>
                          </button>

                          {selectedFile && (
                            <button
                              type="button"
                              onClick={handleUpload}
                              disabled={isUploading}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} />
                                  <span>Publish Photo</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Messages */}
                    {uploadSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <Check size={15} className="shrink-0" />
                        <span>Profile picture updated successfully!</span>
                      </motion.div>
                    )}

                    {uploadError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20"
                      >
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <p className="font-medium">{uploadError}</p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: THEME CHANGE ─────────────────────── */}
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        Theme & Display
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark Theme Card */}
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer text-center relative"
                        style={{
                          background: theme === "dark" ? "var(--color-active-bg)" : "var(--color-bg-tertiary)",
                          border: `2px solid ${
                            theme === "dark"
                              ? "var(--color-accent)"
                              : "var(--color-border-primary)"
                          }`,
                        }}
                      >
                        {theme === "dark" && (
                          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-xs" />
                        )}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/40 border border-white/10"
                          style={{ color: "#a5b4fc" }}
                        >
                          <Moon size={22} />
                        </div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Dark Mode
                        </p>
                      </button>

                      {/* Light Theme Card */}
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all cursor-pointer text-center relative"
                        style={{
                          background: theme === "light" ? "var(--color-active-bg)" : "var(--color-bg-tertiary)",
                          border: `2px solid ${
                            theme === "light"
                              ? "var(--color-accent)"
                              : "var(--color-border-primary)"
                          }`,
                        }}
                      >
                        {theme === "light" && (
                          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-xs" />
                        )}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500"
                        >
                          <Sun size={22} />
                        </div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Light Mode
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: AI MODEL & EFFORT LEVEL (UNFUNCTIONAL) */}
                {activeTab === "model" && (
                  <div className="space-y-6">
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        AI Model & Effort
                      </h3>
                    </div>

                    {/* Change Model Option (Unfunctional) */}
                    <div className="space-y-3">
                      <label
                        className="text-xs font-medium flex items-center gap-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Cpu size={14} />
                        <span>Change Model for AI Response</span>
                      </label>

                      <div className="space-y-2">
                        {[
                          {
                            id: "sync-ai-flash",
                            name: "Sync AI Flash",
                            active: true,
                          },
                          {
                            id: "sync-ai-pro",
                            name: "Sync AI Pro",
                            active: false,
                          },
                          {
                            id: "claude-3-5",
                            name: "Claude 3.5 Sonnet",
                            active: false,
                          },
                          {
                            id: "gpt-4o",
                            name: "GPT-4o Omnimodel",
                            active: false,
                          },
                        ].map((model) => (
                          <div
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className="p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                            style={{
                              background:
                                selectedModel === model.id
                                  ? "var(--color-active-bg)"
                                  : "var(--color-bg-tertiary)",
                              border:
                                selectedModel === model.id
                                  ? "1px solid var(--color-accent)"
                                  : "1px solid var(--color-border-primary)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  selectedModel === model.id
                                    ? "border-indigo-500 bg-indigo-500/20"
                                    : "border-white/20"
                                }`}
                              >
                                {selectedModel === model.id && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                )}
                              </div>
                              <span
                                className="text-xs font-medium"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {model.name}
                              </span>
                            </div>
                            {model.active ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Default
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/40 border border-white/10">
                                Soon
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Effort Level of AI Model Option (Unfunctional) */}
                    <div className="space-y-3 pt-2">
                      <label
                        className="text-xs font-medium flex items-center gap-2"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <Sliders size={14} />
                        <span>Effort Level of the AI Model</span>
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "low" as const, label: "Low Effort" },
                          { id: "medium" as const, label: "Medium Effort" },
                          { id: "high" as const, label: "High Effort" },
                        ].map((level) => (
                          <button
                            key={level.id}
                            type="button"
                            onClick={() => setEffortLevel(level.id)}
                            className="p-3 rounded-xl flex items-center justify-center text-center transition-all cursor-pointer"
                            style={{
                              background:
                                effortLevel === level.id
                                  ? "var(--color-active-bg)"
                                  : "var(--color-bg-tertiary)",
                              border:
                                effortLevel === level.id
                                  ? "1px solid var(--color-accent)"
                                  : "1px solid var(--color-border-primary)",
                            }}
                          >
                            <span
                              className="text-xs font-medium"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {level.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Modal Footer ───────────────────────────────── */}
            <div
              className="flex items-center justify-end px-6 py-3.5 border-t gap-2"
              style={{
                borderColor: "var(--color-border-primary)",
                background: "var(--color-bg-tertiary)",
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--color-hover-bg)",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border-secondary)",
                }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
