import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Sync AI",
  description:
    "Learn about Sync AI, the intelligent assistant powered by RAG, persistent memory, PDF ingestion, and web search capabilities.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/80 p-8 md:p-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-sync-ai">
            {'>>'} Sync AI
          </h1>
          <p className="text-lg text-white/60">
            Your intelligent AI companion — built for clarity, speed, and depth.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">What is Sync AI?</h2>
          <p>
            Sync AI is an AI-powered assistant designed to help you search the web, write code,
            analyze data, and get answers — all in one place. With persistent memory across
            conversations, Sync AI remembers your context and preferences, making every
            interaction smarter than the last.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Core Capabilities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="text-white font-medium">RAG (Retrieval-Augmented Generation)</span>{" "}
              — Upload your PDFs and documents, and Sync AI will intelligently retrieve relevant
              information to answer your questions with grounded, accurate responses.
            </li>
            <li>
              <span className="text-white font-medium">Web Search</span>{" "}
              — Get real-time information from the internet without leaving the conversation.
              Sync AI searches, summarizes, and cites sources for you.
            </li>
            <li>
              <span className="text-white font-medium">Persistent Memory</span>{" "}
              — Unlike traditional chatbots, Sync AI maintains context across your sessions.
              Your preferences, past conversations, and uploaded documents are always accessible.
            </li>
            <li>
              <span className="text-white font-medium">PDF Ingestion</span>{" "}
              — Simply upload a PDF file and ask questions about its content. Sync AI parses,
              indexes, and retrieves answers from your documents instantly.
            </li>
            <li>
              <span className="text-white font-medium">Code Generation</span>{" "}
              — From Python scripts to SQL queries, Sync AI writes, explains, and debugs code
              to help you build faster.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Our Mission</h2>
          <p>
            We believe AI should be accessible, transparent, and genuinely useful. Sync AI is
            built to be more than a chatbot — it is a thoughtful assistant that understands your
            needs and grows with you. We are committed to building AI that respects your privacy,
            keeps your data secure, and delivers real value in every conversation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Privacy First</h2>
          <p>
            Your data belongs to you. We collect only the minimum information required for
            authentication (via Google OAuth) and never sell, share, or use your data for
            advertising. All conversations are encrypted and stored securely. You can delete
            your account and all associated data at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Technology</h2>
          <p>
            Sync AI is built on a modern stack combining a Next.js frontend with a FastAPI
            backend, leveraging advanced language models, vector databases for document retrieval,
            and real-time web search integration. Every component is designed for speed,
            reliability, and seamless user experience.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Get in Touch</h2>
          <p>
            Have questions, feedback, or ideas? We would love to hear from you.
          </p>
          <p>
            Email:{" "}
            <a
              href="mailto:contact@sync-ai.dev"
              className="text-blue-400 hover:underline"
            >
              contact@sync-ai.dev
            </a>
            <br />
            Website:{" "}
            <a
              href="https://sync-ai.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              https://sync-ai.dev
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
