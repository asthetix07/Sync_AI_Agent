"""
Tool definitions for the LangChain agent.
- Web search via Serper (Google Search API)
- Word count utility

Note: Serper API key rotation is handled at call-time by agent.py
(sets os.environ["SERPER_API_KEY"] before each search).
"""

from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.tools import tool
from app.config import settings
from app.utils.logger import logger
import os

# ── Set initial Serper API key in environment ─────────────
# (will be rotated by agent.py on each request)
os.environ["SERPER_API_KEY"] = settings.serper_api_key

# ── Serper wrapper (used internally by the tool) ──────────
_serper_wrapper = GoogleSerperAPIWrapper(k=5)


# ── Web Search Tool (Serper / Google Search) ──────────────
# NOTE: Using @tool decorator instead of Tool() constructor so LangChain
# auto-generates a proper args_schema. Without it, bind_tools() exposes no
# typed parameters and the LLM's tool_call dict ({"query": "..."}) can't be
# dispatched correctly by .invoke().
@tool
def google_search(query: str) -> str:
    """Search the internet using Google for current news, facts, or live data.
    Use this when the user asks about recent events, current prices,
    or any information that requires up-to-date web results."""
    return _serper_wrapper.run(query)


# ── Custom Tools ──────────────────────────────────────────
@tool
def get_word_count(text: str) -> str:
    """Count the number of words in a given text."""
    count = len(text.split())
    return f"The text contains {count} words."


# ── All tools available to the agent ──────────────────────
ALL_TOOLS = [google_search, get_word_count]

# ── Lookup dict for tool execution by name ────────────────
TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}

logger.info(f"Registered {len(ALL_TOOLS)} tools: {[t.name for t in ALL_TOOLS]}")
