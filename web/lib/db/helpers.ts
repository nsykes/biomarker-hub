export function firstOrNull<T>(rows: T[]): T | null {
  return rows.length > 0 ? rows[0] : null;
}

export function firstOrThrow<T>(rows: T[], message = "Record not found"): T {
  if (rows.length === 0) throw new Error(message);
  return rows[0];
}
