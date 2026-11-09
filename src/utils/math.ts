/**
 * Computes electrical power vectors:
 * - Apparent Power S (VA) = V * I
 * - Active Power P (W) = V * I * PF
 * - Reactive Power Q (VAR) = sqrt(S^2 - P^2)
 */
export function calculateElectricalVectors(voltage: number, current: number, pf: number) {
  const apparent = +(voltage * current).toFixed(1);
  const active = +(apparent * pf).toFixed(1);
  const reactiveSquared = Math.max(0, Math.pow(apparent, 2) - Math.pow(active, 2));
  const reactive = +Math.sqrt(reactiveSquared).toFixed(1);

  return { apparent, active, reactive };
}

/**
 * Generates Gaussian-like jitter noise for realistic sensor telemetry simulation
 */
export function generateSensorNoise(amplitude: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * (amplitude / 3);
}

/**
 * Linear clamp
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
