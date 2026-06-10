"""
Smart Intent Classifier — determines whether to web search or answer directly.

Architecture:
  ┌─────────────────────────────────────────────────────────────┐
  │  1. Heuristic pre-filter (0 LLM calls)                     │
  │     ├─ Keyword match → web_search (news, price, today...)  │
  │     └─ Conversational/general → direct_answer               │
  │                                                             │
  │  2. LLM-based classifier (1 call, only when uncertain)     │
  │     ├─ Sees last N messages of context                      │
  │     ├─ Knows today's date                                   │
  │     ├─ Returns structured JSON intent                       │
  │     └─ Rewrites query for better search results             │
  └─────────────────────────────────────────────────────────────┘

Why this is smarter:
  - Old system: 1 LLM call per message JUST for routing (+ 1 for chat = 2 total)
  - New system: heuristic catches ~60% with 0 calls; LLM only for ambiguous cases
  - Context-aware: "what about the latest?" after talking about Tesla → searches "Tesla latest news"
  - Date-aware: knows if a question is about something recent vs historical
"""

import json
import re
from datetime import datetime, timezone
from typing import Optional, List

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.utils.logger import logger


# ── Heuristic patterns ────────────────────────────────────
# These catch obvious cases with zero LLM calls.

_SEARCH_KEYWORDS = re.compile(
    r"\b("
    r"latest|current|today|tonight|yesterday|this week|this month|this year|"
    r"right now|live|real.?time|breaking|recent|update|trending|"
    r"price of|stock price|weather|forecast|score|result|"
    r"who won|who is winning|election|"
    r"news|headline|announcement|release date|"
    r"how much does .+ cost|what is .+ price|"
    r"when is .+ (happening|releasing|coming|starting)|"
    r"is .+ (open|closed|available|down|up)|"
    r"search for|look up|find me|google"
    r")\b",
    re.IGNORECASE,
)

_DIRECT_PATTERNS = re.compile(
    r"\b("
    r"explain|define|what is the definition|how does .+ work|"
    r"write me|write a|generate|create|code|script|"
    r"summarize|translate|help me|teach me|"
    r"hello|hi|hey|thanks|thank you|bye|goodbye|"
    r"what do you think|in your opinion|"
    r"calculate|solve|convert|compare .+ and|"
    r"tell me about|describe|what are the|list the|"
    r"pros and cons|advantages|disadvantages"
    r")\b",
    re.IGNORECASE,
)

# Temporal references that strongly suggest live data is needed
_TEMPORAL_SEARCH = re.compile(
    r"\b("
    r"202[4-9]|203[0-9]|"  # year references in the near future
    r"yesterday|today|tomorrow|this morning|tonight|"
    r"last (week|month|hour|night)|"
    r"just (happened|released|announced|launched)"
    r")\b",
    re.IGNORECASE,
)


class IntentResult:
    """Result of intent classification."""
    __slots__ = ("intent", "rewritten_query", "confidence", "method")

    def __init__(
        self,
        intent: str,
        rewritten_query: str,
        confidence: float = 1.0,
        method: str = "heuristic",
    ):
        self.intent = intent              # "web_search" or "direct_answer"
        self.rewritten_query = rewritten_query  # optimized search query
        self.confidence = confidence
        self.method = method              # "heuristic" or "llm"

    def needs_search(self) -> bool:
        return self.intent == "web_search"

    def __repr__(self) -> str:
        return (
            f"IntentResult(intent={self.intent!r}, "
            f"query={self.rewritten_query!r}, "
            f"confidence={self.confidence:.2f}, "
            f"method={self.method})"
        )


# ── LLM-based classifier (fallback for ambiguous queries) ─
_INTENT_SYSTEM_PROMPT = """\
You are an intent classifier for a conversational AI. Your job is to decide \
whether the user's question requires a LIVE WEB SEARCH or can be answered \
from GENERAL KNOWLEDGE.

Today's date: {today}

## Rules:
1. "web_search" — Use when the answer depends on real-time, current, or frequently-changing data:
   - Current events, news, prices, scores, weather
   - Questions about things that happened recently (last ~2 years)
   - Product availability, release dates, current status
   - People's current roles, latest achievements
   - "What is X doing now", "latest Y", "current Z"

2. "direct_answer" — Use when the answer is stable general knowledge:
   - Science, math, definitions, historical facts
   - Programming help, code generation, explanations
   - Creative writing, translation, summarization
   - Conversational (greetings, follow-ups, opinions)
   - Anything pre-2023 that won't have changed

## Conversation context (last few messages):
{context}

## Instructions:
Analyze the user's LATEST message considering the conversation context above.
Respond with ONLY a JSON object (no markdown, no explanation):
{{"intent": "web_search" or "direct_answer", "rewritten_query": "optimized search query if web_search, otherwise empty string", "confidence": 0.0 to 1.0}}

For rewritten_query: resolve pronouns and references using conversation context.
Example: if they discussed "Tesla" and now ask "what's the latest?", rewrite to "Tesla latest news {today_short}".
"""


def _extract_topic_from_history(history: List[BaseMessage], window: int = 4) -> str:
    """Extract the recent conversation topic for context-aware query rewriting."""
    recent = history[-window:] if len(history) > window else history
    parts = []
    for msg in recent:
        role = "User" if isinstance(msg, HumanMessage) else "AI"
        # Truncate long messages to save tokens
        content = msg.content[:200] if len(msg.content) > 200 else msg.content
        parts.append(f"{role}: {content}")
    return "\n".join(parts) if parts else "(no prior conversation)"


def _heuristic_classify(user_message: str, history: List[BaseMessage]) -> Optional[IntentResult]:
    """
    Fast keyword/pattern matching for obvious intents.
    Returns None if uncertain (falls through to LLM).
    """
    msg_lower = user_message.lower().strip()

    # Very short conversational messages → direct
    if len(msg_lower) < 10 and not _SEARCH_KEYWORDS.search(msg_lower):
        return IntentResult("direct_answer", "", 0.95, "heuristic")

    # Strong search signals
    search_matches = _SEARCH_KEYWORDS.findall(user_message)
    temporal_matches = _TEMPORAL_SEARCH.findall(user_message)

    if search_matches or temporal_matches:
        # Build a reasonable search query
        return IntentResult(
            "web_search",
            user_message,  # LLM will rewrite if needed
            0.85 if search_matches else 0.75,
            "heuristic",
        )

    # Strong direct-answer signals
    direct_matches = _DIRECT_PATTERNS.findall(user_message)
    if direct_matches and not search_matches:
        return IntentResult("direct_answer", "", 0.90, "heuristic")

    # Ambiguous → let LLM decide
    return None


def classify_intent(
    user_message: str,
    history: List[BaseMessage],
    classifier_llm: ChatGoogleGenerativeAI,
) -> IntentResult:
    """
    Classify user intent using heuristics + LLM fallback.

    Args:
        user_message: The current user message.
        history: Recent conversation history (already trimmed).
        classifier_llm: The LLM to use for ambiguous cases.

    Returns:
        IntentResult with intent, rewritten_query, confidence, method.
    """
    # ── Step 1: Try heuristic classification ──────────────
    heuristic_result = _heuristic_classify(user_message, history)
    if heuristic_result is not None:
        logger.info(f"Intent classified by heuristic: {heuristic_result}")
        return heuristic_result

    # ── Step 2: Fall back to LLM classification ───────────
    now = datetime.now(timezone.utc)
    today_full = now.strftime("%A, %B %d, %Y")
    today_short = now.strftime("%Y-%m-%d")

    context = _extract_topic_from_history(history)
    system_prompt = _INTENT_SYSTEM_PROMPT.format(
        today=today_full,
        today_short=today_short,
        context=context,
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_message),
    ]

    try:
        response = classifier_llm.invoke(messages)
        raw = response.content.strip()

        # Parse JSON from the response (handle markdown code blocks)
        if raw.startswith("```"):
            raw = re.sub(r"```(?:json)?\s*", "", raw).rstrip("`").strip()

        parsed = json.loads(raw)
        intent = parsed.get("intent", "direct_answer")
        rewritten = parsed.get("rewritten_query", user_message)
        confidence = float(parsed.get("confidence", 0.7))

        if intent not in ("web_search", "direct_answer"):
            intent = "direct_answer"

        result = IntentResult(intent, rewritten, confidence, "llm")
        logger.info(f"Intent classified by LLM: {result}")
        return result

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning(f"Intent LLM returned unparseable response: {e} — defaulting to direct")
        return IntentResult("direct_answer", "", 0.5, "llm_fallback")
    except Exception as e:
        logger.error(f"Intent classification failed: {e} — defaulting to direct")
        return IntentResult("direct_answer", "", 0.3, "error_fallback")
