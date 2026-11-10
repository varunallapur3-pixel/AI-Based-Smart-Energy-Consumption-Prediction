"""
VOLTIX AI Engine — Feature Engineering.
Generates leakage-free, chronologically sequenced ML features from time-series telemetry.
Guarantees that rolling statistics and lag variables strictly use past observations.
Handles invalid data, NaN/Infinity values, duplicate timestamps, and irregular sampling.
"""

from datetime import datetime, timezone
from typing import List, Tuple, Any, Optional
import pandas as pd
import numpy as np

FORECAST_FEATURE_NAMES = [
    "power_lag_1",
    "power_lag_2",
    "power_lag_3",
    "power_rolling_mean_3",
    "power_rolling_std_3",
    "voltage_v",
    "current_a",
    "power_factor",
    "hour_of_day",
    "day_of_week",
    "time_delta_sec",
]

ANOMALY_FEATURE_NAMES = [
    "voltage_v",
    "current_a",
    "power_w",
    "power_factor",
    "frequency_hz",
    "energy_rate_kw",
]


def _extract_numeric(record: Any, field_name: str, default: Optional[float] = None) -> Optional[float]:
    """Safely extract and cast a numeric field, avoiding TypeError on None or non-numeric types."""
    val = getattr(record, field_name, None) if hasattr(record, field_name) else (
        record.get(field_name) if isinstance(record, dict) else None
    )
    if val is None:
        return default
    try:
        f_val = float(val)
        if not np.isfinite(f_val):
            return default
        return f_val
    except (ValueError, TypeError):
        return default


def _extract_timestamp(record: Any) -> Optional[datetime]:
    """Safely extract and normalize timestamp to timezone-aware UTC datetime."""
    ts = getattr(record, "timestamp", None) if hasattr(record, "timestamp") else (
        record.get("timestamp") if isinstance(record, dict) else None
    )
    if ts is None:
        return None
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts)
        except (ValueError, TypeError):
            return None
    if not isinstance(ts, datetime):
        return None

    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def _telemetry_to_dataframe(telemetry_records: List[Any]) -> pd.DataFrame:
    """
    Convert a list of telemetry ORM instances or dictionaries to a cleaned,
    chronologically sorted Pandas DataFrame.
    Filters invalid numeric readings (NaN, Inf, negatives) and deduplicates timestamps.
    """
    rows = []
    for r in telemetry_records:
        ts = _extract_timestamp(r)
        if ts is None:
            continue

        v = _extract_numeric(r, "voltage_v")
        i = _extract_numeric(r, "current_a")
        p = _extract_numeric(r, "power_w")

        # Core electrical measurements must be valid, finite, and non-negative
        if v is None or v < 0 or i is None or i < 0 or p is None or p < 0:
            continue

        pf = _extract_numeric(r, "power_factor", default=1.0)
        if pf is None or pf < 0.0 or pf > 1.0:
            pf = 1.0

        freq = _extract_numeric(r, "frequency_hz", default=50.0)
        if freq is None or freq <= 0.0:
            freq = 50.0

        energy = _extract_numeric(r, "energy_kwh", default=0.0)
        if energy is None or energy < 0.0:
            energy = 0.0

        r_id = getattr(r, "id", None) if hasattr(r, "id") else (
            r.get("id") if isinstance(r, dict) else None
        )
        source = getattr(r, "source_type", "SIMULATED") if hasattr(r, "source_type") else (
            r.get("source_type", "SIMULATED") if isinstance(r, dict) else "SIMULATED"
        )

        rows.append({
            "id": r_id,
            "timestamp": ts,
            "voltage_v": v,
            "current_a": i,
            "power_w": p,
            "power_factor": pf,
            "frequency_hz": freq,
            "energy_kwh": energy,
            "source_type": str(source),
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Chronological sort and deduplicate timestamps (keeping latest reading)
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"], keep="last").reset_index(drop=True)

    # Calculate time delta between consecutive readings
    time_deltas = df["timestamp"].diff().dt.total_seconds().fillna(0.0)
    df["time_delta_sec"] = time_deltas

    # Calculate energy consumption rate (kW) where meaningful
    delta_energy = df["energy_kwh"].diff().fillna(0.0)
    # If energy delta and time delta are positive, rate = (delta_energy_kwh / delta_hours)
    # Otherwise fallback to power_w / 1000.0 (active power in kW)
    rate_from_energy = np.where(
        (delta_energy > 0) & (time_deltas > 0),
        delta_energy / (time_deltas / 3600.0),
        df["power_w"] / 1000.0,
    )
    df["energy_rate_kw"] = np.maximum(0.0, rate_from_energy)

    return df


def build_forecasting_dataset(
    telemetry_records: List[Any],
    min_samples: int = 15,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series, List[str], float]:
    """
    Construct supervised training features (X) and target (y = power_w) without future data leakage.

    Returns:
        X: Feature matrix sorted chronologically
        y: Target series (active power in Watts)
        timestamps: Series of UTC timestamps corresponding to target y
        feature_names: List of column names in X
        median_interval_sec: Estimated median sampling interval in seconds
    """
    if len(telemetry_records) < min_samples:
        raise ValueError(
            f"Insufficient historical telemetry. At least {min_samples} valid readings are "
            f"required to construct forecasting features (received {len(telemetry_records)})."
        )

    df = _telemetry_to_dataframe(telemetry_records)
    if len(df) < min_samples:
        raise ValueError(
            f"Insufficient valid telemetry after cleaning. At least {min_samples} valid non-duplicate readings "
            f"are required (found {len(df)})."
        )

    positive_deltas = df["time_delta_sec"][df["time_delta_sec"] > 0]
    median_interval_sec = float(positive_deltas.median()) if not positive_deltas.empty else 5.0

    # 1. Temporal calendar features
    df["hour_of_day"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek

    # 2. Lag features (strictly past values: t-1, t-2, t-3)
    df["power_lag_1"] = df["power_w"].shift(1)
    df["power_lag_2"] = df["power_w"].shift(2)
    df["power_lag_3"] = df["power_w"].shift(3)

    # 3. Rolling statistics (shifted by 1 to strictly prevent current-step target leakage!)
    df["power_rolling_mean_3"] = df["power_w"].shift(1).rolling(window=3, min_periods=1).mean()
    df["power_rolling_std_3"] = df["power_w"].shift(1).rolling(window=3, min_periods=1).std().fillna(0.0)

    # 4. Drop initial warm-up rows where lag_3 is NaN
    valid_mask = df["power_lag_3"].notna()
    if valid_mask.sum() < 5:
        raise ValueError("Insufficient valid samples remaining after computing lag features.")

    X = df.loc[valid_mask, FORECAST_FEATURE_NAMES].copy().reset_index(drop=True)
    y = df.loc[valid_mask, "power_w"].copy().reset_index(drop=True)
    timestamps = df.loc[valid_mask, "timestamp"].copy().reset_index(drop=True)

    return X, y, timestamps, FORECAST_FEATURE_NAMES, median_interval_sec


def build_anomaly_features(
    telemetry_records: List[Any],
    min_samples: int = 10,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series, List[str]]:
    """
    Construct multi-variate feature dataset for unsupervised IsolationForest anomaly detection.

    Returns:
        X_anomaly: Feature matrix
        timestamps: Series of UTC timestamps
        ids: Series of database IDs
        feature_names: List of feature names
    """
    if len(telemetry_records) < min_samples:
        raise ValueError(
            f"Insufficient historical telemetry. At least {min_samples} valid readings are "
            f"required for anomaly detection (received {len(telemetry_records)})."
        )

    df = _telemetry_to_dataframe(telemetry_records)
    if len(df) < min_samples:
        raise ValueError(
            f"Insufficient valid telemetry after cleaning. At least {min_samples} valid readings are "
            f"required for anomaly detection (found {len(df)})."
        )

    X = df[ANOMALY_FEATURE_NAMES].copy().reset_index(drop=True)
    timestamps = df["timestamp"].copy().reset_index(drop=True)
    ids = df["id"].copy().reset_index(drop=True)

    return X, timestamps, ids, ANOMALY_FEATURE_NAMES
