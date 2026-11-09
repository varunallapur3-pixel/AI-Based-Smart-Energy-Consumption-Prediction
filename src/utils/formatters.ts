export function formatWatts(watts: number): string {
  if (watts >= 1000) {
    return (watts / 1000).toFixed(2) + ' kW';
  }
  return watts.toFixed(1) + ' W';
}

export function formatVoltage(volts: number): string {
  return volts.toFixed(1) + ' V';
}

export function formatCurrent(amps: number): string {
  return amps.toFixed(amps < 10 ? 3 : 2) + ' A';
}

export function formatEnergy(kwh: number): string {
  return kwh.toFixed(3) + ' kWh';
}

export function formatRupees(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatTimeShort(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function formatDurationSec(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ago`;
}
