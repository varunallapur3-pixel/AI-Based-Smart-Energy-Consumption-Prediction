"""
VOLTIX AI Engine — Evaluation Metrics.
Computes real mathematical metrics for supervised forecasting and unsupervised anomaly detection.
Never fabricates performance figures; clearly bounds R² to mathematically meaningful contexts.
"""

import math
from typing import Optional, Dict, Any
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def evaluate_forecast_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_baseline: np.ndarray,
) -> Dict[str, Any]:
    """
    Calculate chronological out-of-sample forecast accuracy metrics against persistence baseline.

    Args:
        y_true: Actual active power measurements in test window (W).
        y_pred: RandomForestRegressor predictions (W).
        y_baseline: Persistence baseline predictions (W, power_lag_1).

    Returns:
        Dictionary with mae, rmse, r2 (if valid), and baseline_mae.
    """
    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(math.sqrt(mse))
    baseline_mae = float(mean_absolute_error(y_true, y_baseline))

    # R² is only mathematically meaningful when true variance > 1e-4
    var_true = float(np.var(y_true))
    r2_val: Optional[float] = None
    if var_true > 1e-4:
        r2_calc = float(r2_score(y_true, y_pred))
        # Cap lower bound at -1.0 for readability if model severely underperforms baseline
        r2_val = round(max(-1.0, min(1.0, r2_calc)), 4)

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": r2_val,
        "baseline_mae": round(baseline_mae, 3),
    }


def evaluate_anomaly_model(predictions: np.ndarray) -> Dict[str, Any]:
    """
    Calculate statistical summary of IsolationForest outlier classifications.

    Args:
        predictions: Array of IsolationForest predictions (-1 for anomaly, 1 for inlier).

    Returns:
        Dictionary with total samples, anomaly count, and percentage.
    """
    samples_count = int(len(predictions))
    anomaly_count = int(np.sum(predictions == -1))
    anomaly_pct = round((anomaly_count / max(1, samples_count)) * 100.0, 2)

    return {
        "samples_analyzed": samples_count,
        "anomaly_count": anomaly_count,
        "anomaly_percentage": anomaly_pct,
    }
