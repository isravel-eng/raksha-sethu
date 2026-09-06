# RakshaSetu ML prototype

The prototype aggregates 6–10 chronological synthetic check-ins per citizen. A citizen-level stratified 60/20/20 split prevents longitudinal leakage. Features are current check-in values, explicit case-stage stressors, deterministic keyword sentiment/crisis flags, and transparent temporal deltas and rolling statistics.

Synthetic labels are generated once per citizen from the latest observable check-in. The raw label score is:
`0.30*emotional_distress + 0.18*overwhelm + 0.14*(10-sleep_quality) + 0.12*fatigue + 0.08*(10-social_support) + 0.06*(10-coping_ability) + 0.06*max(0, distress_delta) + 0.04*10*threat_reported + 0.02*10*negative_sentiment + N(0, 0.75)`.
The bands are `LOW < 3.0`, `MEDIUM 3.0–<6.0`, `HIGH 6.0–<8.0`, and `URGENT >=8.0`; `self_harm_indicator=1` is an observable safety override to `URGENT`. This widens MEDIUM, reduces unnecessary noise while retaining adjacent-class overlap, and uses only features available at prediction time. Labels are not clinically validated.

`GradientBoostingClassifier` provides the explainable `ml_risk_level` evidence. A balanced `LogisticRegression` predicts `URGENT` versus `NOT_URGENT`; its threshold is selected on validation data to prioritize recall. `calculate_dynamic_score()` combines ML urgent probability, worsening trend, case stressors and secondary NLP into a transparent 0–100 score. Final precedence is: dynamic-score tier becomes `risk_level`; then urgent probability at or above its validation threshold escalates that tier to `URGENT`. `human_review_required` is true for that escalation or for HIGH/URGENT final tiers. Thus ML class output is retained separately and cannot conflict with the final risk tier.

Training saves joblib models, `model_metadata.json`, metrics, classification report data, confusion matrix, urgent precision/recall/F1 and threshold. This is a support-prioritization demo, not diagnosis, clinical assessment, or automated intervention.
