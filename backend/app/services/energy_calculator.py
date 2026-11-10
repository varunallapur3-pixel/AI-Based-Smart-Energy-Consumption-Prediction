"""
VOLTIX Energy Calculator Service
Implements numerical trapezoidal integration for active electrical power readings.

Assumptions & Mathematical Model:
1. Integration Formulation:
   Trapezoidal approximation integrates discrete active power points P(t) over continuous time:
     E_interval (kWh) = ((P_i + P_{i+1}) / 2) * (t_{i+1} - t_i) / 3,600,000
   where P is in Watts (W) and (t_{i+1} - t_i) is in seconds (s).

2. Irregular Sampling Intervals:
   Sensor transmission jitter and variable polling rates result in variable dt (t_{i+1} - t_i).
   Each interval dt is computed individually from explicit timezone-aware UTC timestamps.

3. Missing Intervals & Outage Filtering:
   When dt exceeds `max_gap_seconds` (default: 300.0s / 5 minutes), the pipeline treats the
   interruption as missing telemetry or an offline event. The interval is explicitly excluded
   from numerical summation to avoid artificially accumulating energy across disconnected durations.

4. Legal / Certification Disclaimer:
   Calculated values represent mathematical numerical approximations suitable for monitoring,
   trending, and forecasting. They do not constitute ANSI C12.20 / IEC 62053 certified fiscal
   revenue meter readings.
"""

from datetime import datetime, timezone
from typing import List, Optional, Any
from pydantic import BaseModel, Field


class EnergyCalculationResult(BaseModel):
    """
    Data container for trapezoidal numerical integration output.
    """
    total_energy_kwh: float = Field(..., description="Integrated energy sum in kilowatt-hours (kWh).")
    samples_count: int = Field(..., description="Total sample count evaluated.")
    valid_intervals_count: int = Field(..., description="Number of intervals included in the integral.")
    skipped_intervals_count: int = Field(..., description="Number of intervals skipped due to gap threshold.")
    start_time: Optional[datetime] = Field(default=None, description="Timestamp of first reading.")
    end_time: Optional[datetime] = Field(default=None, description="Timestamp of last reading.")
    calculation_method: str = Field(
        default="Trapezoidal numerical integration: sum(((P_i + P_{i+1}) / 2) * dt / 3,600,000)",
        description="Applied integration method.",
    )
    disclaimer: str = Field(
        default=(
            "Calculated energy is an algorithmic numerical approximation derived from discrete telemetry "
            "power samples and is not an ANSI C12.20 or IEC 62053 utility meter-certified measurement."
        ),
        description="Certification disclaimer.",
    )


def calculate_trapezoidal_energy(
    readings: List[Any],
    max_gap_seconds: float = 300.0,
) -> EnergyCalculationResult:
    """
    Calculate active energy (kWh) from timestamped power readings (W) using trapezoidal integration.

    Args:
        readings: List of objects or dicts having 'timestamp' (datetime) and 'power_w' (float).
        max_gap_seconds: Threshold in seconds above which an interval is considered a telemetry
                         dropout/outage and excluded from integration (default: 300s / 5 mins).

    Returns:
        EnergyCalculationResult with total energy, sample counts, and audit metadata.
    """
    if not readings or len(readings) < 2:
        start_ts = None
        end_ts = None
        if readings and len(readings) == 1:
            r = readings[0]
            ts = r.timestamp if hasattr(r, "timestamp") else r.get("timestamp")
            start_ts = end_ts = ts

        return EnergyCalculationResult(
            total_energy_kwh=0.0,
            samples_count=len(readings) if readings else 0,
            valid_intervals_count=0,
            skipped_intervals_count=0,
            start_time=start_ts,
            end_time=end_ts,
        )

    # Sort chronologically by normalized UTC timestamp
    def get_timestamp(item: Any) -> datetime:
        ts = item.timestamp if hasattr(item, "timestamp") else item["timestamp"]
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        else:
            ts = ts.astimezone(timezone.utc)
        return ts

    def get_power(item: Any) -> float:
        p = item.power_w if hasattr(item, "power_w") else item["power_w"]
        return max(0.0, float(p))

    sorted_readings = sorted(readings, key=get_timestamp)

    total_energy_kwh = 0.0
    valid_intervals = 0
    skipped_intervals = 0

    for i in range(len(sorted_readings) - 1):
        r1 = sorted_readings[i]
        r2 = sorted_readings[i + 1]

        t1 = get_timestamp(r1)
        t2 = get_timestamp(r2)

        dt = (t2 - t1).total_seconds()

        # Handle negative or zero dt (duplicate or reversed timestamps)
        if dt <= 0:
            skipped_intervals += 1
            continue

        # Handle missing intervals / telemetry outage
        if max_gap_seconds is not None and dt > max_gap_seconds:
            skipped_intervals += 1
            continue

        p1 = get_power(r1)
        p2 = get_power(r2)

        # Trapezoidal rule: Area = ((p1 + p2) / 2) * dt (Watt-seconds / Joules)
        # Convert Watt-seconds to kilowatt-hours: divide by (1,000 W/kW * 3,600 s/h) = 3,600,000
        avg_power = (p1 + p2) / 2.0
        interval_kwh = (avg_power * dt) / 3_600_000.0

        total_energy_kwh += interval_kwh
        valid_intervals += 1

    return EnergyCalculationResult(
        total_energy_kwh=round(total_energy_kwh, 6),
        samples_count=len(sorted_readings),
        valid_intervals_count=valid_intervals,
        skipped_intervals_count=skipped_intervals,
        start_time=get_timestamp(sorted_readings[0]),
        end_time=get_timestamp(sorted_readings[-1]),
    )
