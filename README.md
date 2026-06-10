# 🤖 Sync AI

Sync AI is a full-stack, enterprise-grade conversational AI assistant. It features persistent conversation memory, automated PDF document ingestion via Retrieval-Augmented Generation (RAG), context-aware web search routing, and API key load-balancing.

Designed with high concurrency and reliability in mind, it is split into a Next.js frontend and a production-ready FastAPI backend.

---

## 🏗️ Architecture & Key Features

### Backend (FastAPI + LangChain)
- **Context-Aware Agentic Pipeline:** Uses an intelligent query-intent classifier with heuristic pre-filtering to route search queries, minimize latency, and save on LLM token usage.
- **Dynamic API Key Rotation:** Features custom `KeyPool` rotation for Groq, Gemini, and Serper search engines to gracefully handle high concurrency and model rate limits.
- **Robust RAG Pipeline:** Handles PDF ingestion by parsing, semantic/token chunking, embedding generation using Google Gemini, and storing in a PostgreSQL database with the `pgvector` extension.
- **Thread-Safe Memory & Cache:** Implements checkpointed database session storage coupled with an in-process LRU cache (TTL-based) to ensure fast state retrieval for active threads.
- **Enterprise-Grade Security:** Equipped with secure CORS controls, HTTP Security Headers, request payload size limitations (DoS protection), and rate-limiting (`slowapi`).

### Frontend (Next.js + TailwindCSS)
- **Sleek UI/UX:** A responsive sidebar, theme toggle, and messaging canvas.
- **Real-Time Streaming:** Implements SSE (Server-Sent Events) streaming directly from the LLM for a low-latency chat experience.
- **Google OAuth:** Integrated secure authentication flow.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance, modern web framework for building APIs with Python. |
| **Orchestration** | [LangChain](https://www.langchain.com/) | Prompt management, agent tool-calling, and custom chains. |
| **LLM Inference** | [Groq](https://groq.com/) | Llama-3.3-70B for chatting/RAG; Llama-3.1-8B for intent classification. |
| **Vector DB / Storage** | [PostgreSQL](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) | Vector storage, chat history tracking, and session state persistence. |
| **Embeddings** | [Google Gemini](https://ai.google.dev/) | High-quality text embeddings (`gemini-embedding-2-preview`). |
| **Search Engine** | [Serper API](https://serper.dev/) | High-speed Google Search API for web grounding. |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (TypeScript) | Server-side rendering, routing, and component-based UI. |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL instance running with the `pgvector` extension installed (`CREATE EXTENSION IF NOT EXISTS vector;`)

---

### 📥 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Initialize & activate virtual environment:**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Note: For production, you can supply comma-separated lists for `GEMINI_API_KEYS`, `GROQ_API_KEYS`, and `SERPER_API_KEYS` to enable automated rotation.*

 5. **Run the API server:**
   - **For Development (with auto-reload):**
     ```bash
     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
     ```
   - **For Production (using Gunicorn + Uvicorn workers):**
     ```bash
     gunicorn app.main:app \
       -w 4 \
       -k uvicorn.workers.UvicornWorker \
       --bind 0.0.0.0:8000 \
       --timeout 120 \
       --graceful-timeout 30 \
       --access-logfile -
     ```
   - **Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) (disabled in production by default)
   - **Health Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 💻 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install node modules:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file and add the API base URL and your Google OAuth credentials:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔗 Links
[![portfolio](https://img.shields.io/badge/my_portfolio-000?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ovrsenssy.me/)
[![linkedin](https://img.shields.io/badge/linkedin-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/asthetix07/)
[![twitter](https://img.shields.io/badge/twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://x.com/asthetix__07/)
