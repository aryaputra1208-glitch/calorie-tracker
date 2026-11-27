const MODEL = "claude-haiku-5-5";
export default {
  async fetch(req, env) {
    const cors = {"Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*","Access-Control-Allow-Methods": "POST, OPTIONS","Access-Control-Allow-Headers": "Content-Type, X-Access-Code","Access-Control-Max-Age": "86400"};
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    if (req.headers.get("X-Access-Code") !== env.ACCESS_CODE) return json({ error: "kode akses salah" }, 401);
    const raw = await req.text();
    if (raw.length > 1500000) return json({ error: "foto terlalu besar" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: "format" }, 400); }
    if (!Array.isArray(body.messages) || body.messages.length !== 1) return json({ error: "format" }, 400);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: body.messages })
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
