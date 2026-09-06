"""Transparent 0-100 dynamic distress score."""
from __future__ import annotations
def calculate_dynamic_score(ml_probability: float, features: dict[str, float]) -> dict[str, float | str]:
    trend = max(0, min(1, (features.get("distress_delta", 0) + features.get("worsening_checkins", 0) * .5) / 5))
    case = max(0, min(1, (.15 * features.get("case_stage_score", 0) + .2 * features.get("threat_reported_latest", 0) + .15 * features.get("protection_needed_latest", 0) + .1 * features.get("relief_pending_latest", 0) + .1 * features.get("legal_aid_pending_latest", 0))))
    nlp = max(0, min(1, .6 * features.get("negative_sentiment", 0) + .4 * features.get("crisis_keyword_flag", 0)))
    score = max(0, min(100, 60 * ml_probability + 20 * trend + 15 * case + 5 * nlp))
    tier = "URGENT" if score >= 75 or features.get("self_harm_indicator_latest", 0) else "HIGH" if score >= 55 else "MEDIUM" if score >= 30 else "LOW"
    return {"score": round(score, 2), "risk_tier": tier, "trend_component": round(trend, 3), "case_component": round(case, 3), "nlp_component": round(nlp, 3)}
