"""Prediction helper for a chronological check-in history."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Mapping

import joblib
import pandas as pd

from .features import history_to_features
from .dynamic_score import calculate_dynamic_score


ROOT = Path(__file__).resolve().parents[1]


def _load(model_dir: str | Path | None = None):
    directory = Path(model_dir) if model_dir else ROOT / "models"
    if not (directory / "risk_model.joblib").exists():
        raise FileNotFoundError("model artifacts are missing; run `python -m src.train` from ml-service")
    risk = joblib.load(directory / "risk_model.joblib")
    urgent = joblib.load(directory / "urgent_model.joblib")
    metadata = json.loads((directory / "model_metadata.json").read_text(encoding="utf-8"))
    return risk, urgent, metadata


def predict_risk(checkin_history: Iterable[Mapping], model_dir: str | Path | None = None) -> dict:
    """Return model output, dynamic score, and feature-level explanations."""
    risk, urgent, metadata = _load(model_dir)
    features = history_to_features(checkin_history)
    row = pd.DataFrame([features]).reindex(columns=risk["feature_names"], fill_value=0.0)
    predicted_label = str(risk["model"].predict(row)[0])
    probabilities = risk["model"].predict_proba(row)[0]
    urgent_probability = float(urgent["model"].predict_proba(row)[0, 1])
    threshold = float(urgent["threshold"])
    score = calculate_dynamic_score(urgent_probability, features)
    urgent_escalation = urgent_probability >= threshold
    if urgent_escalation:
        score["risk_tier"] = "URGENT"
    trend = "worsening" if features["distress_delta"] > 0.5 or features["worsening_checkins"] > 0 else "stable/improving"
    risk_factors = [name for name, value in (("emotional distress", features["emotional_distress_latest"]), ("worsening trend", features["distress_delta"]), ("sleep disruption", 10 - features["sleep_quality_latest"]), ("safety signal", features["self_harm_indicator_latest"] + features["threat_reported_latest"]), ("negative sentiment", features["negative_sentiment"])) if value > 0.5]
    protective = [name for name, value in (("social support", features["social_support_latest"]), ("coping ability", features["coping_ability_latest"])) if value >= 7]
    return {
        "risk_level": score["risk_tier"],
        "ml_risk_level": predicted_label,
        "class_probabilities": {str(label): round(float(probability), 6)
                               for label, probability in zip(risk["classes"], probabilities)},
        "urgent_probability": round(urgent_probability, 6),
        "confidence": round(float(max(probabilities)), 6),
        "trend": trend,
        "top_risk_factors": risk_factors[:5],
        "protective_factors": protective,
        "human_review_required": bool(urgent_escalation or score["risk_tier"] in {"HIGH", "URGENT"}),
        "dynamic_score": score,
        "model_version": metadata["model_version"],
        "disclaimer": "Synthetic demonstration only; not a diagnosis or clinical recommendation.",
    }
