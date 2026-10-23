export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const headers = { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" };
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response(JSON.stringify({ error: "Missing or invalid token" }), { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  let r: Response;
  try {
    r = await fetch(`${url}/rest/v1/rpc/widget_summary`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ error: "Tracker is unreachable right now" }), { status: 503, headers });
  }
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
  return new Response(JSON.stringify(data), { status: 200, headers });
}
