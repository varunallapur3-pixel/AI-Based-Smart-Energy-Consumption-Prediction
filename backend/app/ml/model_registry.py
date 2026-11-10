"""
VOLTIX AI Engine — Model Registry.
Handles safe serialization, versioning, metadata storage, and loading of ML artifacts using Joblib.
Protects against missing or corrupted files with robust error handling.
"""

import os
import json
import logging
import shutil
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import joblib

logger = logging.getLogger(__name__)

DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent / "model_artifacts"


class ModelRegistry:
    """
    Filesystem-backed registry for device-specific forecasting and anomaly detection models.
    """

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else DEFAULT_ARTIFACTS_DIR
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def _get_device_dir(self, device_id: str) -> Path:
        """Sanitize device_id for safe filesystem path."""
        safe_id = "".join(c for c in device_id if c.isalnum() or c in ("-", "_")).strip()
        if not safe_id:
            safe_id = "default_device"
        device_dir = self.artifacts_dir / safe_id
        device_dir.mkdir(parents=True, exist_ok=True)
        return device_dir

    def save_device_artifacts(
        self,
        device_id: str,
        forecast_model: Any,
        anomaly_model: Any,
        metadata: Dict[str, Any],
    ) -> Path:
        """
        Serialize trained models and training metadata to disk.
        """
        device_dir = self._get_device_dir(device_id)

        forecast_path = device_dir / "forecast_model.joblib"
        anomaly_path = device_dir / "anomaly_model.joblib"
        metadata_path = device_dir / "metadata.json"

        # Serialize models
        joblib.dump(forecast_model, forecast_path)
        joblib.dump(anomaly_model, anomaly_path)

        # Write metadata
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, default=str)

        return device_dir

    def load_forecast_model(self, device_id: str) -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
        """
        Safely load the forecast model and metadata for a device.
        Returns (None, None) if not found or corrupted.
        """
        device_dir = self._get_device_dir(device_id)
        model_path = device_dir / "forecast_model.joblib"
        metadata_path = device_dir / "metadata.json"

        if not model_path.exists() or not metadata_path.exists():
            return None, None

        if model_path.stat().st_size == 0 or metadata_path.stat().st_size == 0:
            return None, None

        try:
            model = joblib.load(model_path)
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            return model, metadata
        except Exception as exc:
            logger.warning("Failed to load forecast model artifact for %s: %s", device_id, exc)
            return None, None

    def load_anomaly_model(self, device_id: str) -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
        """
        Safely load the anomaly model and metadata for a device.
        Returns (None, None) if not found or corrupted.
        """
        device_dir = self._get_device_dir(device_id)
        model_path = device_dir / "anomaly_model.joblib"
        metadata_path = device_dir / "metadata.json"

        if not model_path.exists() or not metadata_path.exists():
            return None, None

        if model_path.stat().st_size == 0 or metadata_path.stat().st_size == 0:
            return None, None

        try:
            model = joblib.load(model_path)
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            return model, metadata
        except Exception as exc:
            logger.warning("Failed to load anomaly model artifact for %s: %s", device_id, exc)
            return None, None

    def get_model_status(self, device_id: str) -> Dict[str, Any]:
        """
        Check training status and return available metadata for a device.
        Verifies artifact integrity before reporting 'ready'.
        """
        device_dir = self._get_device_dir(device_id)
        forecast_path = device_dir / "forecast_model.joblib"
        anomaly_path = device_dir / "anomaly_model.joblib"
        metadata_path = device_dir / "metadata.json"

        forecast_ready = False
        if forecast_path.exists() and forecast_path.stat().st_size > 0:
            try:
                joblib.load(forecast_path)
                forecast_ready = True
            except Exception:
                forecast_ready = False

        anomaly_ready = False
        if anomaly_path.exists() and anomaly_path.stat().st_size > 0:
            try:
                joblib.load(anomaly_path)
                anomaly_ready = True
            except Exception:
                anomaly_ready = False

        metadata: Optional[Dict[str, Any]] = None
        if metadata_path.exists() and metadata_path.stat().st_size > 0:
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
            except Exception:
                metadata = None

        return {
            "device_id": device_id,
            "forecast_model_status": "ready" if forecast_ready else "not_trained",
            "anomaly_model_status": "ready" if anomaly_ready else "not_trained",
            "metadata": metadata,
        }

    def delete_device_artifacts(self, device_id: str) -> bool:
        """Remove artifacts for a device if deleted."""
        device_dir = self._get_device_dir(device_id)
        try:
            if device_dir.exists():
                shutil.rmtree(device_dir)
            return True
        except Exception as exc:
            logger.warning("Failed to delete artifacts for %s: %s", device_id, exc)
            return False


# Shared default registry instance
registry = ModelRegistry()
