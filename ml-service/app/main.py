"""FastAPI adapter for the existing RakshaSetu ML prediction service."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.predict import _load, predict_risk

from .schemas import PredictRequest

app = FastAPI(title="RakshaSetu ML Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _smoke_check() -> dict:
    """Run a minimal real prediction so deployment health covers model inference."""
    sample = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message_text": "Routine check-in; no immediate safety concern reported.",
        "emotional_distress": 5,
        "distress_frequency": 2,
        "overwhelm": 5,
        "sleep_quality": 6,
        "fatigue": 5,
        "social_support": 6,
        "coping_ability": 6,
        "self_harm_indicator": 0,
        "case_stage": "TRIAL",
        "days_until_hearing": 14,
        "hearing_postponed": 0,
        "postponement_days": 0,
        "threat_reported": 0,
        "protection_needed": 0,
        "relief_pending": 0,
        "legal_aid_pending": 0,
    }
    return predict_risk([sample])


@app.get("/health")
def health() -> dict[str, object]:
    try:
        _load()
    except Exception as exc:  # deployment diagnostics
        return {
            "status": "ok",
            "model_loaded": False,
            "error_type": type(exc).__name__,
            "error": str(exc),
        }
    return {"status": "ok", "model_loaded": True}


@app.get("/diagnostics")
def diagnostics() -> dict[str, object]:
    """Public prototype diagnostics for distinguishing model-load vs inference failures."""
    try:
        prediction = _smoke_check()
        return {
            "status": "ok",
            "model_loaded": True,
            "prediction_ok": True,
            "risk_level": prediction.get("risk_level"),
            "ml_risk_level": prediction.get("ml_risk_level"),
            "model_version": prediction.get("model_version"),
        }
    except Exception as exc:
        return {
            "status": "error",
            "model_loaded": True,
            "prediction_ok": False,
            "error_type": type(exc).__name__,
            "error": str(exc),
        }


@app.post("/predict")
def predict(request: PredictRequest) -> dict:
    try:
        return predict_risk([checkin.model_dump() for checkin in request.checkin_history])
    except Exception as exc:
        # Return a structured upstream error so the Node backend/frontend can
        # surface the actual ML failure instead of a generic error.
        raise HTTPException(
            status_code=503,
            detail={
                "error": "ML prediction failed",
                "error_type": type(exc).__name__,
                "message": str(exc),
            },
        ) from exc
