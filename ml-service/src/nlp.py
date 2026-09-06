"""Deterministic keyword sentiment analysis; no language model is used."""
from __future__ import annotations
import re

NEGATIVE = {"sad", "afraid", "unsafe", "worried", "anxious", "overwhelmed", "hopeless", "alone", "tired", "threat"}
POSITIVE = {"safe", "supported", "hopeful", "better", "coping", "help"}
CRISIS = {"suicide", "self-harm", "hurt myself", "end my life", "unsafe", "immediate danger"}


def analyze_text(text: str) -> dict[str, float]:
    raw = str(text or "").lower()
    tokens = re.findall(r"[a-z]+", raw)
    neg = sum(token in NEGATIVE for token in tokens)
    pos = sum(token in POSITIVE for token in tokens)
    sentiment = float(np_clip((pos - neg) / max(len(tokens), 1), -1, 1))
    return {
        "sentiment_score": sentiment,
        "negative_sentiment": float(sentiment < -0.05),
        "crisis_keyword_flag": float(any(term in raw for term in CRISIS)),
    }


def np_clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
