/*
  Extract client IP from Next.js Request/NextRequest.
*/

export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwarded =
    headers.get("x-forwarded-for") ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "";

  // x-forwarded-for can contain a list: client, proxy1, proxy2
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;

  // Fallback to remote addr if available
  // @ts-expect-error Node-only property when using NextRequest
  const remote = req?.ip || "";
  return typeof remote === "string" && remote ? remote : "unknown";
}
