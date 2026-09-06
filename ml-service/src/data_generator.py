"""Generate fixed-seed synthetic longitudinal check-ins and transparent labels."""
from __future__ import annotations
from pathlib import Path
import numpy as np
import pandas as pd
from .nlp import analyze_text

SEED = 20260906
TEXT = ["I feel safe and supported.", "I am worried and tired.", "I feel overwhelmed and alone.", "I feel unsafe and need immediate help."]
STAGES = ["FIR", "CHARGESHEET", "TRIAL", "RELIEF", "CLOSED"]

def generate_dataset(output: str | Path, n_citizens: int = 500, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed); rows = []
    for number in range(n_citizens):
        count = int(rng.integers(6, 11)); latent = float(rng.beta(2.2, 2.0)); slope = float(rng.normal(0.03, 0.08))
        start = pd.Timestamp("2024-01-01") + pd.Timedelta(days=int(rng.integers(0, 120))); history = []
        for i in range(count):
            level = float(np.clip(latent + slope * i + rng.normal(0, .08), 0, 1))
            stage = str(rng.choice(STAGES, p=[.2, .2, .3, .15, .15]))
            distress = float(np.clip(1 + 8.5 * level + rng.normal(0, .8), 0, 10))
            sleep = float(np.clip(8 - 4 * level + rng.normal(0, .6), 0, 10))
            self_harm = int(rng.random() < max(0, (level - .65) * .7))
            threat = int(rng.random() < max(0, (level - .5) * .45))
            text = TEXT[3 if self_harm or threat else 2 if level > .65 else 1 if level > .35 else 0]
            history.append({"timestamp": start + pd.Timedelta(days=i * int(rng.integers(5, 12))), "message_text": text,
                "emotional_distress": distress, "distress_frequency": int(np.clip(round(level * 7 + rng.normal(0, .7)), 0, 7)),
                "overwhelm": float(np.clip(1 + 8 * level + rng.normal(0, .8), 0, 10)), "sleep_quality": sleep,
                "fatigue": float(np.clip(1 + 8 * level + rng.normal(0, .8), 0, 10)),
                "social_support": float(np.clip(8 - 6 * level + rng.normal(0, .8), 0, 10)),
                "coping_ability": float(np.clip(8 - 5 * level + rng.normal(0, .8), 0, 10)),
                "self_harm_indicator": self_harm, "case_stage": stage,
                "days_until_hearing": int(rng.integers(0, 181)), "hearing_postponed": int(rng.random() < .2),
                "postponement_days": int(rng.integers(0, 61)), "threat_reported": threat,
                "protection_needed": int(threat and rng.random() < .7), "relief_pending": int(stage == "RELIEF" and rng.random() < .7),
                "legal_aid_pending": int(rng.random() < .25)})
        last = history[-1]; nlp = analyze_text(last["message_text"]); d = last["emotional_distress"] - history[-2]["emotional_distress"]
        score = 0.38*last["emotional_distress"] + .16*last["overwhelm"] + .14*(10-last["sleep_quality"]) + .10*last["fatigue"] + .08*max(0,d) + .08*last["threat_reported"]*10 + .06*nlp["negative_sentiment"]*10 + .12*last["self_harm_indicator"]*10
        score += rng.normal(0, 1.6)
        label = "URGENT" if last["self_harm_indicator"] or score >= 7.5 else "HIGH" if score >= 5.4 else "MEDIUM" if score >= 3.4 else "LOW"
        for i, record in enumerate(history, 1):
            nlp = analyze_text(record["message_text"])
            rows.append({"citizen_id": f"C{number+1:04d}", "checkin_id": f"C{number+1:04d}-{i:02d}", **record, **nlp, "risk_level": label})
    frame = pd.DataFrame(rows); output = Path(output); output.parent.mkdir(parents=True, exist_ok=True); frame.to_csv(output, index=False); return frame
