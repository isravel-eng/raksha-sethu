"""Demo: a citizen whose distress worsens over several check-ins."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.predict import predict_risk

history = [
    {"timestamp": "2024-01-01", "emotional_distress": 3, "overwhelm": 3, "sleep_quality": 7, "social_support": 7, "coping_ability": 7, "message_text": "I feel supported.", "case_stage": "FIR"},
    {"timestamp": "2024-01-10", "emotional_distress": 6, "overwhelm": 6, "sleep_quality": 5, "social_support": 4, "coping_ability": 4, "message_text": "I am worried and tired.", "case_stage": "TRIAL"},
    {"timestamp": "2024-01-20", "emotional_distress": 9, "overwhelm": 9, "sleep_quality": 2, "social_support": 2, "coping_ability": 2, "threat_reported": 1, "protection_needed": 1, "message_text": "I feel unsafe and need immediate help.", "case_stage": "TRIAL"},
]

if __name__ == "__main__":
    print(predict_risk(history))
