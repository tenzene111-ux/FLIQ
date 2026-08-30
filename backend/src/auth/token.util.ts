// Parses simple duration strings ("15m", "30d", "1h", "45s") into milliseconds.
// Matches the subset of the `ms` package's syntax that JWT_*_EXPIRES_IN uses.
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration string: "${input}"`);
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}
