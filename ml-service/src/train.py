"""Train and report the deterministic four-class and urgent models."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             f1_score, precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .features import build_feature_frame, feature_columns
from .data_generator import SEED, generate_dataset


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "data" / "synthetic_checkins.csv"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "reports"


def _choose_threshold(y_true: np.ndarray, probabilities: np.ndarray) -> tuple[float, dict]:
    candidates = np.linspace(0.05, 0.95, 91)
    records = []
    for threshold in candidates:
        predictions = (probabilities >= threshold).astype(int)
        records.append({
            "threshold": float(threshold),
            "recall": float(recall_score(y_true, predictions, zero_division=0)),
            "precision": float(precision_score(y_true, predictions, zero_division=0)),
            "f1": float(f1_score(y_true, predictions, zero_division=0)),
            "positive_rate": float(predictions.mean()),
        })
    # Recall is the primary objective. Precision, then a higher threshold,
    # make ties deterministic and avoid an unnecessarily permissive tie.
    selected = max(records, key=lambda row: (row["recall"], row["precision"], row["threshold"]))
    return selected["threshold"], selected


def _metrics(y_true, labels, predictions, probabilities=None) -> dict:
    result = {
        "accuracy": float(accuracy_score(y_true, predictions)),
        "macro_f1": float(f1_score(y_true, predictions, average="macro", zero_division=0)),
        "classification_report": classification_report(y_true, predictions, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(y_true, predictions).tolist(),
    }
    if probabilities is not None and len(np.unique(y_true)) == 2:
        result["precision"] = float(precision_score(y_true, predictions, zero_division=0))
        result["recall"] = float(recall_score(y_true, predictions, zero_division=0))
        result["f1"] = float(f1_score(y_true, predictions, zero_division=0))
        result["roc_auc"] = float(roc_auc_score(y_true, probabilities))
    return result


def train() -> dict:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    if not DATASET.exists():
        generate_dataset(DATASET)
    raw = pd.read_csv(DATASET, parse_dates=["timestamp"])
    citizens = build_feature_frame(raw)
    labels = raw.groupby("citizen_id", sort=True)["risk_level"].first().reindex(citizens["citizen_id"]).to_numpy()
    feature_names = feature_columns(citizens)
    X = citizens[feature_names]
    urgent = (labels == "URGENT").astype(int)
    # Every citizen appears in exactly one split; no check-in from a citizen
    # can cross a split boundary.
    ids = citizens["citizen_id"].to_numpy()
    train_ids, test_ids, y_train, y_test = train_test_split(
        ids, labels, test_size=0.20, random_state=SEED, stratify=labels
    )
    train_ids, val_ids, y_train, y_val = train_test_split(
        train_ids, y_train, test_size=0.25, random_state=SEED, stratify=y_train
    )
    id_to_index = {citizen_id: index for index, citizen_id in enumerate(ids)}
    index = lambda values: [id_to_index[value] for value in values]
    gbt = GradientBoostingClassifier(
        n_estimators=120, learning_rate=0.06, max_depth=2, random_state=SEED
    )
    gbt.fit(X.iloc[index(train_ids)], y_train)
    gbt_predictions = gbt.predict(X.iloc[index(test_ids)])
    gbt_probabilities = gbt.predict_proba(X.iloc[index(test_ids)])

    urgent_model = Pipeline([
        ("scale", StandardScaler()),
        ("model", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=SEED)),
    ])
    urgent_model.fit(X.iloc[index(train_ids)], (y_train == "URGENT").astype(int))
    val_probabilities = urgent_model.predict_proba(X.iloc[index(val_ids)])[:, 1]
    threshold, threshold_metrics = _choose_threshold((y_val == "URGENT").astype(int), val_probabilities)
    test_probabilities = urgent_model.predict_proba(X.iloc[index(test_ids)])[:, 1]
    urgent_predictions = (test_probabilities >= threshold).astype(int)

    metrics = {
        "dataset": {
            "citizens": int(len(citizens)),
            "checkins": int(len(raw)),
            "class_counts": {str(k): int(v) for k, v in pd.Series(labels).value_counts().sort_index().items()},
        },
        "split": {"train_citizens": len(train_ids), "validation_citizens": len(val_ids), "test_citizens": len(test_ids)},
        "four_class_gradient_boosting": _metrics(y_test, gbt.classes_, gbt_predictions, gbt_probabilities.max(axis=1)),
        "urgent_logistic_regression": {
            **_metrics((y_test == "URGENT").astype(int), [0, 1], urgent_predictions, test_probabilities),
            "validation_threshold_selection": threshold_metrics,
            "threshold_objective": "maximize validation recall; precision and higher threshold break ties",
        },
    }
    joblib.dump({"model": gbt, "feature_names": feature_names, "classes": list(gbt.classes_)},
                MODEL_DIR / "risk_model.joblib")
    joblib.dump({"model": urgent_model, "feature_names": feature_names, "threshold": threshold},
                MODEL_DIR / "urgent_model.joblib")
    metadata = {
        "seed": SEED,
        "model_version": "synthetic-risk-v1",
        "feature_names": feature_names,
        "risk_classes": list(gbt.classes_),
        "urgent_threshold": threshold,
        "dataset_sizes": {"citizens": int(len(citizens)), "checkins": int(len(raw))},
        "split_sizes": {"train": len(train_ids), "validation": len(val_ids), "test": len(test_ids)},
        "split_strategy": "citizen-level stratified train/validation/test (60/20/20)",
        "data_source": "synthetic only; no clinical labels",
        "intended_use": "transparent support-priority demonstration, not diagnosis or clinical decision-making",
    }
    (MODEL_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (REPORT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    predictions = pd.DataFrame({
        "citizen_id": test_ids,
        "actual_risk_label": y_test,
        "predicted_risk_label": gbt_predictions,
        "urgent_probability": test_probabilities,
        "urgent_prediction": urgent_predictions,
    })
    predictions.to_csv(REPORT_DIR / "test_predictions.csv", index=False)
    (REPORT_DIR / "feature_importance.csv").write_text(
        pd.DataFrame({"feature": feature_names, "importance": gbt.feature_importances_})
        .sort_values("importance", ascending=False).to_csv(index=False), encoding="utf-8"
    )
    return {"metrics": metrics, "metadata": metadata}


if __name__ == "__main__":
    result = train()
    print(json.dumps({
        "split": result["metrics"]["split"],
        "four_class_accuracy": result["metrics"]["four_class_gradient_boosting"]["accuracy"],
        "urgent_recall": result["metrics"]["urgent_logistic_regression"]["recall"],
        "urgent_threshold": result["metadata"]["urgent_threshold"],
    }, indent=2))
