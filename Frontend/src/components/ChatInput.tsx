"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
} from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onUploadPdf?: (file: File) => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** If true, center the input for the home screen layout */
  variant?: "home" | "chat";
}

export default function ChatInput({
  onSend,
  onUploadPdf,
  isLoading,
  isDisabled = false,
  variant = "chat",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadPdf) {
      if (file.size > 10 * 1024 * 1024) {
        window.alert("Warning: The file is larger than 10MB. It might take longer to process.");
      }
      onUploadPdf(file);
      e.target.value = ""; // reset so same file can be re-uploaded
    }
  };

  // Auto-resize textarea — only grow when there's actual content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto first to correctly measure scrollHeight
      textareaRef.current.style.height = "auto";
      if (input.trim().length === 0) {
        // No content — enforce single-row height
        textareaRef.current.style.height = "40px";
      } else {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }
  }, [input]);

  return (
    <div className={`w-full ${variant === "home" ? "max-w-2xl" : "max-w-4xl"} mx-auto px-4`}>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-3 rounded-2xl transition-all"
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border-secondary)",
          boxShadow: "0 25px 50px -12px var(--color-shadow)",
        }}
      >
        {/* Attachment Button */}
        {onUploadPdf && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload-input"
            />
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: "var(--color-text-muted)" }}
              title="Upload PDF"
            >
              <img
                src="/icons8-add-file.svg"
                alt="Add file"
                className="w-[20px] h-[20px]"
                style={{ filter: "var(--color-file-icon-filter)" }}
              />
            </button>
          </>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? "Please log in to use Sync AI..." : "Ask Sync AI anything..."}
          disabled={isDisabled}
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 text-[15px] leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: "var(--color-text-primary)",
            caretColor: "var(--color-accent)",
            minHeight: "40px",
            maxHeight: "200px",
          }}
        />

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 pr-1">
          {/* Model Badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase select-none"
            style={{
              background: "var(--color-surface-chip)",
              color: "var(--color-text-faint)",
            }}
          >
            <Sparkles size={12} className="text-indigo-400" />
            AI
          </div>

          {/* Send Button */}
          <AnimatePresence>
            {input.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                type="submit"
                disabled={isLoading || isDisabled}
                className="p-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
