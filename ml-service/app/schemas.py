"""Request schemas for the existing ML prediction interface."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Checkin(BaseModel):
    timestamp: datetime | str
    message_text: str = ""
    emotional_distress: float = Field(default=0, ge=0, le=10)
    distress_frequency: float = Field(default=0, ge=0, le=7)
    overwhelm: float = Field(default=0, ge=0, le=10)
    sleep_quality: float = Field(default=0, ge=0, le=10)
    fatigue: float = Field(default=0, ge=0, le=10)
    social_support: float = Field(default=0, ge=0, le=10)
    coping_ability: float = Field(default=0, ge=0, le=10)
    self_harm_indicator: float = Field(default=0, ge=0, le=1)
    case_stage: Literal["FIR", "CHARGESHEET", "TRIAL", "RELIEF", "CLOSED"] = "FIR"
    days_until_hearing: float = 0
    hearing_postponed: float = Field(default=0, ge=0, le=1)
    postponement_days: float = 0
    threat_reported: float = Field(default=0, ge=0, le=1)
    protection_needed: float = Field(default=0, ge=0, le=1)
    relief_pending: float = Field(default=0, ge=0, le=1)
    legal_aid_pending: float = Field(default=0, ge=0, le=1)


class PredictRequest(BaseModel):
    checkin_history: list[Checkin] = Field(min_length=1)
