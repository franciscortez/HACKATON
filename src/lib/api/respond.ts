export type ErrorStatus = 400 | 404 | 413 | 429 | 502;

export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function fail(code: string, message: string, status: ErrorStatus, extra?: Record<string, unknown>): Response {
  return Response.json({ error: { code, message, ...extra } }, { status });
}
