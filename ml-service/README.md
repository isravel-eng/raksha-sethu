# RakshaSetu ML distress-risk prototype

Run from this directory:

```text
pip install -r requirements.txt
python -m src.train
python examples/example_prediction.py
```

Training generates 500 synthetic citizens with 6–10 chronological check-ins in
`data/synthetic_checkins.csv`, performs a citizen-level split, and saves models,
`model_metadata.json`, and evaluation reports. The features are deliberately
limited to current check-in, case-stage, deterministic keyword NLP, and
longitudinal trend signals. The labels are noisy synthetic labels and are not
clinically validated.

`src.predict.predict_risk(checkin_history)` returns a risk tier, class
probabilities, urgent probability, confidence, trend, risk/protective factors,
dynamic score, and whether a human counsellor review is required. It is a
prototype for review prioritisation, not diagnosis or automated intervention.

## API

Install the dependencies and start the API from `ml-service`:

```text
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Use `GET /health` to verify model artifacts are loaded. Send chronological
check-ins to `POST /predict` as `{"checkin_history": [...]}`. The endpoint
returns the existing `predict_risk()` result unchanged.

Example:

```text
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d "{\"checkin_history\":[{\"timestamp\":\"2024-01-01T00:00:00\",\"message_text\":\"I feel supported.\",\"case_stage\":\"FIR\"}]}"
```
