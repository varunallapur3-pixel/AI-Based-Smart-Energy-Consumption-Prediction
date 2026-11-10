"""
VOLTIX AI Engine — Power Forecasting Pipeline.
Supervised machine learning using RandomForestRegressor with chronological validation.
Supports multi-step recursive forecasting and baseline persistence comparison.
"""

from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from app.ml.feature_engineering import (
    FORECAST_FEATURE_NAMES,
    _extract_numeric,
    _extract_timestamp,
)
from app.ml.evaluation import evaluate_forecast_model
from app.schemas.ai import ForecastStep, ForecastMetrics

MODEL_NAME = "RandomForestRegressor"
MODEL_VERSION = "1.0.0"


class PowerForecaster:
    """
    Manages training, chronological evaluation, and multi-step inference for active power forecasting.
    """

    def __init__(self, n_estimators: int = 50, max_depth: int = 8, random_state: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            random_state=self.random_state,
            min_samples_leaf=2,
        )

    def train_and_evaluate(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_ratio: float = 0.2,
    ) -> Tuple[RandomForestRegressor, ForecastMetrics]:
        """
        Train the model using chronological validation to strictly prevent future-data leakage.

        Args:
            X: Feature matrix sorted chronologically.
            y: Active power target series.
            test_ratio: Fraction of the most recent samples reserved for chronological evaluation.

        Returns:
            Trained model fit on all available data, and evaluation metrics from the holdout split.
        """
        n_samples = len(X)
        split_idx = int(n_samples * (1.0 - test_ratio))

        # Ensure test split has at least 2 samples for meaningful variance
        if split_idx >= n_samples - 2:
            split_idx = max(2, n_samples - 3)

        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Train on earlier chronological segment
        eval_model = RandomForestRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            random_state=self.random_state,
            min_samples_leaf=1,
        )
        eval_model.fit(X_train, y_train)

        # Persistence baseline: predict y(t) = y(t-1) which is feature 'power_lag_1'
        y_baseline = X_test["power_lag_1"].values
        y_pred = eval_model.predict(X_test)
        # Ensure predicted power is non-negative
        y_pred = np.maximum(0.0, y_pred)

        metrics_dict = evaluate_forecast_model(
            y_true=y_test.values,
            y_pred=y_pred,
            y_baseline=y_baseline,
        )

        metrics = ForecastMetrics(
            mae=metrics_dict["mae"],
            rmse=metrics_dict["rmse"],
            r2=metrics_dict["r2"],
            baseline_mae=metrics_dict["baseline_mae"],
            model_name=MODEL_NAME,
            version=MODEL_VERSION,
        )

        # Fit final model on all data for operational inference
        self.model.fit(X, y)
        return self.model, metrics

    @staticmethod
    def forecast_multistep(
        model: RandomForestRegressor,
        latest_telemetry: List[Any],
        horizon_steps: int = 5,
        median_interval_sec: float = 5.0,
    ) -> List[ForecastStep]:
        """
        Perform recursive autoregressive multi-step active power prediction.

        Args:
            model: Serialized RandomForestRegressor model.
            latest_telemetry: At least 3 recent readings to establish initial lag buffer.
            horizon_steps: Number of forward steps to project.
            median_interval_sec: Time delta between projected steps.

        Returns:
            List of ForecastStep objects with predicted power and projected UTC timestamps.
        """
        if len(latest_telemetry) < 3:
            raise ValueError("At least 3 historical readings are required to initialize the forecast state.")

        sorted_recent = sorted(
            [r for r in latest_telemetry if _extract_timestamp(r) is not None],
            key=_extract_timestamp,
        )
        if len(sorted_recent) < 3:
            raise ValueError("At least 3 valid historical readings are required to initialize the forecast state.")

        r_last = sorted_recent[-1]
        r_prev1 = sorted_recent[-2]
        r_prev2 = sorted_recent[-3]

        p_last = _extract_numeric(r_last, "power_w", default=0.0) or 0.0
        p_prev1 = _extract_numeric(r_prev1, "power_w", default=0.0) or 0.0
        p_prev2 = _extract_numeric(r_prev2, "power_w", default=0.0) or 0.0

        voltage = _extract_numeric(r_last, "voltage_v", default=230.0) or 230.0
        voltage = max(1.0, voltage)

        pf = _extract_numeric(r_last, "power_factor", default=0.95) or 0.95
        pf = min(1.0, max(0.1, pf))

        last_time = _extract_timestamp(r_last)
        dt_step = max(1.0, median_interval_sec)

        # State buffer for recursive rolling prediction
        lag_buffer = [p_prev2, p_prev1, p_last]
        forecast_steps: List[ForecastStep] = []

        current_time = last_time

        for step in range(1, horizon_steps + 1):
            current_time = current_time + timedelta(seconds=dt_step)

            lag_1 = lag_buffer[-1]
            lag_2 = lag_buffer[-2]
            lag_3 = lag_buffer[-3]

            rolling_mean = float(np.mean([lag_3, lag_2, lag_1]))
            rolling_std = float(np.std([lag_3, lag_2, lag_1]))

            # Estimated current corresponding to lag_1 via Ohm's / electrical power law
            current_a = max(0.0, lag_1 / max(1.0, (voltage * pf)))

            feature_dict = {
                "power_lag_1": lag_1,
                "power_lag_2": lag_2,
                "power_lag_3": lag_3,
                "power_rolling_mean_3": rolling_mean,
                "power_rolling_std_3": rolling_std,
                "voltage_v": voltage,
                "current_a": current_a,
                "power_factor": pf,
                "hour_of_day": current_time.hour,
                "day_of_week": current_time.weekday(),
                "time_delta_sec": dt_step,
            }

            feat_df = pd.DataFrame([feature_dict])[FORECAST_FEATURE_NAMES]
            predicted_power = float(model.predict(feat_df)[0])
            predicted_power = max(0.0, round(predicted_power, 2))

            forecast_steps.append(
                ForecastStep(
                    step=step,
                    timestamp=current_time,
                    predicted_power_w=predicted_power,
                )
            )

            # Shift state buffer
            lag_buffer.append(predicted_power)

        return forecast_steps
