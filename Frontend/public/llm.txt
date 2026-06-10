# Sync AI — Intelligent AI Assistant

> Sync AI is an AI-powered conversational assistant that combines Retrieval-Augmented Generation (RAG), persistent memory, PDF document ingestion, and real-time web search into a single, unified chat interface.

## Overview

Sync AI is a full-stack AI chatbot application designed to help users interact with documents, search the web, write code, and analyze data — all through natural language conversation. It features a modern, dark-themed UI built with Next.js and a powerful FastAPI backend leveraging LangChain, PostgreSQL with pgvector, and Google Generative AI.

## Core Features

### 1. Conversational AI Chat
- Natural language conversation with an AI assistant powered by Google Generative AI (Gemini).
- Context-aware responses that maintain conversational history within a session.
- Ability to regenerate previous responses for improved answers.
- Real-time streaming-style message rendering with markdown support.

### 2. PDF Document Ingestion & RAG
- Upload PDF documents directly into a chat session.
- Documents are automatically chunked, embedded, and stored in a PostgreSQL + pgvector vector store.
- Ask questions about uploaded documents and receive answers grounded in the document content.
- Retrieval-Augmented Generation (RAG) ensures responses are factually anchored to your source material.

### 3. Web Search
- Real-time web search capability integrated into the chat.
- The AI agent can autonomously decide when to search the web for up-to-date information.
- Search results are synthesized into coherent, cited responses.

### 4. Persistent Memory
- Chat sessions are persisted in a PostgreSQL database.
- Conversation history is retained across page reloads and browser sessions.
- Users can resume previous conversations seamlessly.

### 5. Session Management
- Create, switch between, and delete chat sessions from the sidebar.
- Each session maintains its own conversation history and uploaded document context.
- Sessions are automatically titled based on the first user message.

### 6. Google OAuth Authentication
- Secure sign-in via Google OAuth 2.0.
- User profiles (name, email, profile picture) are stored in PostgreSQL.
- Authentication state is managed across the application.

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 | React framework with App Router |
| React 19 | UI component library |
| TypeScript | Type-safe development |
| Tailwind CSS 4 | Utility-first CSS styling |
| Framer Motion | Animations and transitions |
| Lucide React | Icon library |
| React Markdown | Markdown rendering in chat |
| React Syntax Highlighter | Code block syntax highlighting |
| @react-oauth/google | Google OAuth integration |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | Python async web framework |
| LangChain | AI agent orchestration and RAG pipeline |
| Google Generative AI (Gemini) | Large Language Model provider |
| PostgreSQL | Relational database for session and user data |
| pgvector | Vector similarity search extension for PostgreSQL |
| Python 3.11+ | Backend runtime |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│              (Next.js + React)               │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ HomeView │ │ ChatView │ │   Sidebar    │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │             │              │         │
│       └─────────────┼──────────────┘         │
│                     │                        │
│              ┌──────┴──────┐                 │
│              │  API Client │                 │
│              └──────┬──────┘                 │
└─────────────────────┼───────────────────────┘
                      │ HTTP (REST)
┌─────────────────────┼───────────────────────┐
│                  Backend                     │
│               (FastAPI + LangChain)          │
│                     │                        │
│  ┌──────────────────┼──────────────────────┐ │
│  │            API Routers                  │ │
│  │  /chat  /upload-pdf  /sessions  /auth   │ │
│  └──────────────────┬──────────────────────┘ │
│                     │                        │
│  ┌─────────┐ ┌──────┴──────┐ ┌────────────┐ │
│  │  Agent  │ │  Ingestion  │ │   OAuth    │ │
│  │  Core   │ │  Pipeline   │ │   Module   │ │
│  └────┬────┘ └──────┬──────┘ └─────┬──────┘ │
│       │             │              │         │
│       └─────────────┼──────────────┘         │
│                     │                        │
│           ┌─────────┴─────────┐              │
│           │   PostgreSQL +    │              │
│           │    pgvector       │              │
│           └───────────────────┘              │
└──────────────────────────────────────────────┘
```

## API Endpoints

### Chat
- `POST /chat` — Send a message and receive an AI response. Requires `session_id` and `message` in the request body.

### Document Upload
- `POST /upload-pdf` — Upload a PDF file for RAG ingestion. Requires `session_id` and `file` (multipart form data).

### Sessions
- `GET /sessions` — List all chat sessions with their message counts.
- `GET /sessions/{session_id}` — Retrieve the full message history for a session.
- `DELETE /sessions/{session_id}` — Delete a session and all associated data (chat history and vector embeddings).

### Authentication
- `POST /auth/google` — Verify a Google OAuth ID token and create/update the user profile.

### Health
- `GET /health` — Health check endpoint returning service status.

## How to Use Sync AI

### Getting Started
1. Visit the Sync AI application in your web browser.
2. Sign in with your Google account when prompted.
3. You will see the home screen with the prompt "What can Sync AI help you with?"

### Starting a Conversation
1. Type your question or message in the chat input box at the bottom of the screen.
2. Press Enter or click the send button to submit your message.
3. The AI will respond with a contextual answer.
4. Continue the conversation naturally — the AI remembers the context within the session.

### Uploading a PDF Document
1. Click the attachment/upload icon in the chat input area.
2. Select a PDF file from your device.
3. The document will be processed, chunked, and indexed automatically.
4. A confirmation message will show how many chunks were stored.
5. You can now ask questions about the document content.

### Using Quick Suggestions
The home screen offers four quick-start suggestions:
- **Analyze a document** — Upload and query PDF documents.
- **Write some code** — Get help with programming tasks.
- **Search the web** — Find current information from the internet.
- **Analyze data** — Get explanations and insights about data topics.

### Managing Sessions
- Click the **sidebar toggle** (menu icon) to open the session panel.
- Click **New Chat** to start a fresh conversation.
- Click on any previous session to resume it.
- Hover over a session and click the **trash icon** to delete it.

## Pages

| Path | Description |
|---|---|
| `/` | Main application — home screen and chat interface |
| `/privacy_policy` | Privacy Policy page |
| `/terms_of_service` | Terms of Service page |

## Contact & Links

- **Application Name**: Sync AI
- **Version**: 1.0.0
- **Type**: Web Application (SaaS)
- **Category**: Artificial Intelligence, Productivity, Document Analysis

## SEO Keywords

Sync AI, AI chatbot, RAG chatbot, PDF analysis AI, document question answering, conversational AI assistant, web search AI, persistent memory chatbot, LangChain application, Google Gemini chatbot, vector search, pgvector, FastAPI chatbot, Next.js AI app, intelligent assistant
