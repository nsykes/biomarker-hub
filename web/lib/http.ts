/** Build a JSON Response using `new Response(JSON.stringify(...))`.
 *
 *  Next.js 16 Turbopack has a known quirk where `Response.json()` and
 *  `NextResponse.json()` silently return empty bodies in async route
 *  handlers under certain conditions. The `new Response(JSON.stringify(...))`
 *  pattern is reliable. All route handlers that return JSON should use
 *  this helper to avoid hitting the quirk. */
export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}
