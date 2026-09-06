"""FastAPI adapter for the existing RakshaSetu ML prediction service."""
from __future__ import annotations

from fastapi import FastAPI
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
def health() -> dict[str, bool | str]:
    try:
        _load()
    except (FileNotFoundError, OSError, ValueError, KeyError):
        return {"status": "ok", "model_loaded": False}
    return {"status": "ok", "model_loaded": True}


@app.post("/predict")
def predict(request: PredictRequest) -> dict:
    return predict_risk([checkin.model_dump() for checkin in request.checkin_history])
