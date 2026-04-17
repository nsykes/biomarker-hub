/** Structured logger.
 *
 *  - In production: emits single-line JSON. Vercel indexes these into
 *    searchable log records; keeps Sentry/Datadog drop-in one line away.
 *  - In development: pretty-prints for readability.
 *
 *  Keep this tiny. It is NOT pino/winston — adopt one of those only if the
 *  app actually needs log levels, sampling, or transports. */

type Level = "info" | "warn" | "error";

type Extra = Record<string, unknown>;

function emit(level: Level, event: string, extra?: Extra, err?: unknown): void {
  const base: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    event,
    ...extra,
  };
  if (err instanceof Error) {
    base.error = { name: err.name, message: err.message, stack: err.stack };
  } else if (err !== undefined) {
    base.error = String(err);
  }

  const isProd = process.env.NODE_ENV === "production";
  const line = isProd
    ? JSON.stringify(base)
    : `[${level}] ${event} ${Object.keys(base).length > 3 ? JSON.stringify({ ...base, time: undefined, level: undefined, event: undefined }) : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, extra?: Extra) => emit("info", event, extra),
  warn: (event: string, extra?: Extra) => emit("warn", event, extra),
  error: (event: string, err?: unknown, extra?: Extra) =>
    emit("error", event, extra, err),
};
