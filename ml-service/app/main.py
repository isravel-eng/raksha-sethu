"""FastAPI adapter for the existing RakshaSetu ML prediction service."""
from __future__ import annotations

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
