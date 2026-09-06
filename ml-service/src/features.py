"""Transparent citizen-level temporal and case feature engineering."""
from __future__ import annotations

from typing import Iterable, Mapping
import numpy as np
import pandas as pd
from .nlp import analyze_text

CURRENT = [
    "emotional_distress", "distress_frequency", "overwhelm", "sleep_quality",
    "fatigue", "social_support", "coping_ability", "self_harm_indicator",
]
CASE = [
    "case_stage", "days_until_hearing", "hearing_postponed", "postponement_days",
    "threat_reported", "protection_needed", "relief_pending", "legal_aid_pending",
]
REQUIRED = ["timestamp", "message_text", *CURRENT, *CASE]
STAGE_SCORE = {"FIR": 0, "CHARGESHEET": 1, "TRIAL": 2, "RELIEF": 1, "CLOSED": 0}


def _ordered(history: Iterable[Mapping]) -> pd.DataFrame:
    frame = pd.DataFrame(list(history))
    if frame.empty:
        raise ValueError("checkin_history must contain at least one check-in")
    for column in REQUIRED:
        if column not in frame:
            frame[column] = "" if column in ("timestamp", "message_text", "case_stage") else 0
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], errors="coerce").fillna(pd.Timestamp("2024-01-01"))
    frame["case_stage"] = frame["case_stage"].astype(str).str.upper().where(
        frame["case_stage"].astype(str).str.upper().isin(STAGE_SCORE), "FIR"
    )
    frame["message_text"] = frame["message_text"].fillna("").astype(str)
    for column in CURRENT + [c for c in CASE if c != "case_stage"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    return frame.sort_values("timestamp", kind="stable").reset_index(drop=True)


def history_to_features(history: Iterable[Mapping]) -> dict[str, float]:
    frame = _ordered(history)
    latest = frame.iloc[-1]
    distress = frame["emotional_distress"].to_numpy(float)
    sleep = frame["sleep_quality"].to_numpy(float)
    text = analyze_text(str(latest["message_text"]))
    previous = float(distress[-2]) if len(distress) > 1 else float(distress[-1])
    midpoint = max(1, len(distress) // 2)
    result = {f"{c}_latest": float(latest[c]) for c in CURRENT}
    result.update({f"{c}_latest": float(latest[c]) for c in CASE if c != "case_stage"})
    result["case_stage_score"] = float(STAGE_SCORE[str(latest["case_stage"])])
    result.update({
        "previous_distress": previous,
        "distress_delta": float(distress[-1] - previous),
        "sleep_delta": float(sleep[-1] - (sleep[-2] if len(sleep) > 1 else sleep[-1])),
        "rolling_distress_mean": float(np.mean(distress[-3:])),
        "rolling_distress_max": float(np.max(distress[-3:])),
        "worsening_checkins": float(np.sum(np.diff(distress) > 0.5)),
        "trend_slope": float(np.polyfit(np.arange(len(distress)), distress, 1)[0]) if len(distress) > 1 else 0.0,
        "checkin_count": float(len(frame)),
        **text,
    })
    return result


def build_feature_frame(checkins: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for citizen_id, group in checkins.groupby("citizen_id", sort=True):
        row = history_to_features(group.to_dict("records"))
        row["citizen_id"] = citizen_id
        rows.append(row)
    return pd.DataFrame(rows).replace([np.inf, -np.inf], 0).fillna(0)


def feature_columns(frame: pd.DataFrame) -> list[str]:
    return [c for c in frame.columns if c != "citizen_id"]
