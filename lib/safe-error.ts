export function publicErrorMessage(err: unknown, fallback = "request failed") {
  if (process.env.NODE_ENV === "production") return fallback;
  return err instanceof Error ? err.message : fallback;
}

