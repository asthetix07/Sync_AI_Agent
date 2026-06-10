"""
API Key Rotation Pool — distributes requests across multiple API keys.

Architecture:
  ┌───────────────────────────────────────────────────────────┐
  │  KeyPool (per-service)                                    │
  │  ├─ keys: list[str]           ← multiple API keys         │
  │  ├─ _index: int               ← round-robin counter       │
  │  ├─ _lock: threading.Lock     ← thread-safe rotation      │
  │  └─ get_key() → str           ← returns next key           │
  └───────────────────────────────────────────────────────────┘

Usage:
  gemini_pool = KeyPool.from_csv(settings.get_gemini_keys())
  key = gemini_pool.get_key()  # thread-safe round-robin

If only 1 key is provided, it works identically to the old system.
"""

import threading
from typing import List

from app.utils.logger import logger


class KeyPool:
    """
    Thread-safe round-robin API key pool.
    Distributes load across multiple keys to avoid rate limits.
    """

    def __init__(self, keys: List[str], name: str = "unnamed"):
        if not keys or all(k.strip() == "" for k in keys):
            raise ValueError(f"KeyPool '{name}' requires at least one non-empty key")
        self._keys = [k.strip() for k in keys if k.strip()]
        self._name = name
        self._index = 0
        self._lock = threading.Lock()
        logger.info(f"KeyPool '{name}' initialized with {len(self._keys)} key(s)")

    @classmethod
    def from_csv(cls, csv_string: str, name: str = "unnamed") -> "KeyPool":
        """Create a KeyPool from a comma-separated string of keys."""
        keys = [k.strip() for k in csv_string.split(",") if k.strip()]
        return cls(keys, name)

    def get_key(self) -> str:
        """Get the next API key in round-robin order (thread-safe)."""
        with self._lock:
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
            # Prevent integer overflow on very long-running servers
            if self._index >= 1_000_000_000:
                self._index = 0
        return key

    @property
    def count(self) -> int:
        """Number of keys in the pool."""
        return len(self._keys)

    def __repr__(self) -> str:
        return f"KeyPool(name={self._name!r}, keys={self.count})"
