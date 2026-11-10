"""
VOLTIX AI Engine — Anomaly Detection Pipeline.
Unsupervised machine learning using Scikit-Learn IsolationForest.
Detects electrical anomalies, supports configurable anomaly thresholds,
and provides explainable contributing factor attribution.
"""

from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from app.ml.feature_engineering import ANOMALY_FEATURE_NAMES
from app.ml.evaluation import evaluate_anomaly_model
from app.schemas.ai import AnomalyMetrics, AnomalyItem

MODEL_NAME = "IsolationForest"
MODEL_VERSION = "1.0.0"


class AnomalyDetector:
    """
    Manages IsolationForest training, outlier scoring, and factor attribution.
    """

    def __init__(self, contamination: float = 0.05, n_estimators: int = 100, random_state: int = 42):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
        )
        self.baseline_stats: Dict[str, Dict[str, float]] = {}

    def train(self, X: pd.DataFrame) -> Tuple[IsolationForest, AnomalyMetrics, Dict[str, Dict[str, float]]]:
        """
        Fit the IsolationForest model and record feature distribution baselines for explainability.

        Args:
            X: Feature matrix containing ANOMALY_FEATURE_NAMES.

        Returns:
            Fitted IsolationForest, summary AnomalyMetrics, and baseline statistics.
        """
        self.model.fit(X)
        predictions = self.model.predict(X)

        metrics_dict = evaluate_anomaly_model(predictions)
        metrics = AnomalyMetrics(
            samples_analyzed=metrics_dict["samples_analyzed"],
            anomaly_count=metrics_dict["anomaly_count"],
            anomaly_percentage=metrics_dict["anomaly_percentage"],
            model_name=MODEL_NAME,
            version=MODEL_VERSION,
        )

        # Compute baseline statistics per feature for factor attribution
        self.baseline_stats = {}
        for col in ANOMALY_FEATURE_NAMES:
            if col in X.columns:
                vals = X[col].values
                mean_val = float(np.mean(vals))
                std_val = float(np.std(vals))
                self.baseline_stats[col] = {
                    "mean": round(mean_val, 3),
                    "std": round(max(1e-4, std_val), 3),
                    "min": round(float(np.min(vals)), 3),
                    "max": round(float(np.max(vals)), 3),
                }

        return self.model, metrics, self.baseline_stats

    @staticmethod
    def detect_and_explain(
        model: IsolationForest,
        baseline_stats: Dict[str, Dict[str, float]],
        X: pd.DataFrame,
        timestamps: pd.Series,
        ids: pd.Series,
        device_id: str,
        threshold: Optional[float] = None,
    ) -> List[AnomalyItem]:
        """
        Evaluate readings for anomalies and explain contributing measurements.

        Args:
            model: Trained IsolationForest instance.
            baseline_stats: Baseline statistical parameters per feature.
            X: Feature matrix for inference.
            timestamps: UTC timestamps for each reading.
            ids: Database IDs for each reading.
            device_id: Device identifier.
            threshold: Optional custom anomaly threshold (0.0 to 1.0). When provided,
                       readings with score >= threshold are classified as anomalies.

        Returns:
            List of AnomalyItem instances for detected outliers.
        """
        if X.empty:
            return []

        preds = model.predict(X)  # -1 = anomaly, 1 = inlier
        raw_scores = model.decision_function(X)  # lower = more abnormal

        # Normalize decision function to [0.0, 1.0] anomaly severity scale
        # Negative decision_function maps to higher anomaly score
        anomaly_scores = 1.0 / (1.0 + np.exp(np.clip(raw_scores * 8.0, -20.0, 20.0)))

        anomalies: List[AnomalyItem] = []

        for idx in range(len(X)):
            score = round(float(anomaly_scores[idx]), 3)

            # Determine anomaly classification:
            # If explicit threshold is passed, use score >= threshold; otherwise use model's decision boundary
            if threshold is not None:
                is_outlier = score >= threshold
            else:
                is_outlier = preds[idx] == -1

            if is_outlier:
                row = X.iloc[idx]
                ts = timestamps.iloc[idx]
                r_id = int(ids.iloc[idx]) if pd.notna(ids.iloc[idx]) else 0

                # Identify which features contributed to the statistical departure
                contributing_factors: List[str] = []
                for feat in ANOMALY_FEATURE_NAMES:
                    if feat in row:
                        val = float(row[feat])
                        stats = baseline_stats.get(feat, {})
                        mean_val = stats.get("mean", 0.0)
                        std_val = max(1e-3, stats.get("std", 1.0))

                        z_score = (val - mean_val) / std_val
                        if abs(z_score) >= 2.0:
                            sign_desc = "above" if z_score > 0 else "below"
                            contributing_factors.append(
                                f"{feat} ({val:.1f} is {abs(z_score):.1f}σ {sign_desc} baseline mean {mean_val:.1f})"
                            )

                if not contributing_factors:
                    contributing_factors.append(
                        "Multivariate pattern deviation (joint anomaly across electrical parameters)"
                    )

                anomalies.append(
                    AnomalyItem(
                        id=r_id,
                        device_id=device_id,
                        timestamp=ts,
                        voltage_v=float(row.get("voltage_v", 0.0)),
                        current_a=float(row.get("current_a", 0.0)),
                        power_w=float(row.get("power_w", 0.0)),
                        power_factor=float(row.get("power_factor", 1.0)),
                        frequency_hz=float(row.get("frequency_hz", 50.0)),
                        anomaly_score=score,
                        is_anomaly=True,
                        contributing_factors=contributing_factors,
                    )
                )

        return anomalies
