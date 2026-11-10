"""
VOLTIX Virtual Telemetry Simulator Service.
Generates realistic, physically consistent synthetic AC electrical telemetry
for registered SIMULATED devices only.
Guarantees that virtual readings are never marked or inferred as PHYSICAL.
"""

import math
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.device import Device, DeviceType
from app.models.telemetry import Telemetry
from app.services.telemetry_service import TelemetryService
from app.schemas.telemetry import TelemetryCreate


class SimulatorService:
    """
    Synthetic telemetry generator for virtual devices.
    Simulates realistic single-phase AC electricity parameters:
    - RMS Voltage (V) centered around 230.0V
    - RMS Current (A) representing dynamic inductive/resistive loads
    - Power Factor (cos phi) between 0.85 and 0.98
    - Active Power (W) computed as P = V * I * PF
    - Frequency (Hz) centered around 50.0 Hz
    - Energy (kWh) integrated using trapezoidal increments
    """

    @staticmethod
    def _synthesize_sample(
        base_voltage: float = 230.0,
        load_level: float = 1.0,
    ) -> tuple[float, float, float, float, float]:
        """
        Synthesize realistic physical AC values.
        Returns: (voltage_v, current_a, power_w, power_factor, frequency_hz)
        """
        # Voltage: Gaussian variation around 230V bounded in [218.0, 242.0]
        voltage_v = round(random.gauss(base_voltage, 1.8), 2)
        voltage_v = max(218.0, min(242.0, voltage_v))

        # Current: 1.5A to 12.0A scaled by load_level with noise
        base_current = 4.5 * load_level
        current_a = round(max(0.2, random.gauss(base_current, 0.6)), 3)

        # Power factor: 0.88 - 0.97
        power_factor = round(min(0.99, max(0.80, random.uniform(0.88, 0.97))), 3)

        # Active Power P = V * I * PF (Watts)
        power_w = round(voltage_v * current_a * power_factor, 2)

        # Grid frequency: 50.0Hz +/- 0.08Hz
        frequency_hz = round(random.gauss(50.0, 0.04), 2)

        return voltage_v, current_a, power_w, power_factor, frequency_hz

    @classmethod
    def generate_reading_for_device(
        cls,
        db: Session,
        device_id: str,
        timestamp: Optional[datetime] = None,
        load_level: float = 1.0,
    ) -> Telemetry:
        """
        Generate and persist a single realistic synthetic reading for a simulated device.
        Rejects PHYSICAL hardware devices.
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{device_id}' not found.",
            )

        if device.device_type != DeviceType.SIMULATED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Device '{device_id}' is a PHYSICAL hardware device. "
                    "The virtual telemetry simulator only operates on registered SIMULATED devices."
                ),
            )

        v, i, p, pf, freq = cls._synthesize_sample(load_level=load_level)
        ts = timestamp or datetime.now(timezone.utc)

        # Determine cumulative energy from previous reading if available
        last_reading = (
            db.query(Telemetry)
            .filter(Telemetry.device_id == device_id)
            .order_by(Telemetry.timestamp.desc())
            .first()
        )

        energy_kwh = 0.0
        if last_reading and last_reading.timestamp:
            dt = (ts - last_reading.timestamp).total_seconds()
            if 0 < dt <= 300.0:
                avg_p = (last_reading.power_w + p) / 2.0
                inc_kwh = (avg_p * dt) / 3_600_000.0
                prev_energy = last_reading.energy_kwh or 0.0
                energy_kwh = round(prev_energy + inc_kwh, 5)
            elif last_reading.energy_kwh:
                energy_kwh = last_reading.energy_kwh

        telemetry_in = TelemetryCreate(
            device_id=device_id,
            voltage_v=v,
            current_a=i,
            power_w=p,
            power_factor=pf,
            frequency_hz=freq,
            energy_kwh=energy_kwh,
            source_type=DeviceType.SIMULATED,
            timestamp=ts,
        )

        return TelemetryService.ingest_telemetry(db=db, telemetry_in=telemetry_in)

    @classmethod
    def generate_batch_readings(
        cls,
        db: Session,
        device_id: str,
        count: int = 10,
        interval_seconds: float = 5.0,
        start_time: Optional[datetime] = None,
    ) -> List[Telemetry]:
        """
        Generate and persist a continuous time-series sequence of synthetic readings.
        Computes accurate trapezoidal cumulative energy between time steps.
        """
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Device '{device_id}' not found.",
            )

        if device.device_type != DeviceType.SIMULATED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Device '{device_id}' is a PHYSICAL device. "
                    "Cannot simulate readings for physical hardware."
                ),
            )

        base_time = start_time or (
            datetime.now(timezone.utc) - timedelta(seconds=(count * interval_seconds))
        )

        # Get existing baseline energy if any
        latest = (
            db.query(Telemetry)
            .filter(Telemetry.device_id == device_id)
            .order_by(Telemetry.timestamp.desc())
            .first()
        )
        cum_energy = latest.energy_kwh if latest and latest.energy_kwh else 0.0
        prev_p: Optional[float] = latest.power_w if latest else None

        generated_records: List[Telemetry] = []

        for step in range(count):
            curr_time = base_time + timedelta(seconds=(step * interval_seconds))
            # Vary load slightly cyclically
            load_factor = 1.0 + 0.3 * math.sin(step / 3.0)
            v, i, p, pf, freq = cls._synthesize_sample(load_level=load_factor)

            if prev_p is not None:
                avg_p = (prev_p + p) / 2.0
                inc_kwh = (avg_p * interval_seconds) / 3_600_000.0
                cum_energy = round(cum_energy + inc_kwh, 6)
            prev_p = p

            reading = Telemetry(
                device_id=device_id,
                voltage_v=v,
                current_a=i,
                power_w=p,
                power_factor=pf,
                frequency_hz=freq,
                energy_kwh=cum_energy,
                source_type=DeviceType.SIMULATED.value,
                timestamp=curr_time,
            )
            db.add(reading)
            generated_records.append(reading)

        # Update last_seen on device
        if generated_records:
            device.last_seen = generated_records[-1].timestamp
            device.updated_at = datetime.now(timezone.utc)

        db.commit()
        for r in generated_records:
            db.refresh(r)

        return generated_records

    @classmethod
    def simulate_all_simulated_devices(cls, db: Session) -> List[Telemetry]:
        """
        Generate one synthetic reading for every registered SIMULATED device.
        """
        sim_devices = (
            db.query(Device)
            .filter(Device.device_type == DeviceType.SIMULATED.value)
            .all()
        )

        now = datetime.now(timezone.utc)
        results: List[Telemetry] = []
        for dev in sim_devices:
            rec = cls.generate_reading_for_device(db=db, device_id=dev.device_id, timestamp=now)
            results.append(rec)
        return results
