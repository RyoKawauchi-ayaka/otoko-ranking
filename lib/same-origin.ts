export function assertSameOrigin(req: Request) {
  if (process.env.NODE_ENV !== "production") return;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    throw new Error("bad request");
  }
  const expected = `https://${host}`;
  if (origin !== expected) {
    throw new Error("bad request");
  }
}

