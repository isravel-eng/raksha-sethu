# RakshaSetu ML prototype

The prototype aggregates 6–10 chronological synthetic check-ins per citizen. A citizen-level stratified 60/20/20 split prevents longitudinal leakage. Features are current check-in values, explicit case-stage stressors, deterministic keyword sentiment/crisis flags, and transparent temporal deltas and rolling statistics.

Synthetic labels are noisy combinations of distress, deterioration, sleep/fatigue, support/coping, safety signals, case stressors and negative sentiment. Self-harm or extreme combined stress can produce `URGENT`; labels are not clinically validated.

`GradientBoostingClassifier` predicts `LOW/MEDIUM/HIGH/URGENT`. A balanced `LogisticRegression` predicts `URGENT` versus `NOT_URGENT`; its threshold is selected on validation data to prioritize recall. `calculate_dynamic_score()` combines urgent probability, worsening trend, case stressors and secondary NLP into a transparent 0–100 score. High urgent probability or HIGH/URGENT score requires human counsellor review.

Training saves joblib models, `model_metadata.json`, metrics, classification report data, confusion matrix, urgent precision/recall/F1 and threshold. This is a support-prioritization demo, not diagnosis, clinical assessment, or automated intervention.
