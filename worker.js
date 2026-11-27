// Cloudflare Worker — proxy aman untuk aplikasi Catat Kalori.
// API key Anthropic disimpan di sini (sebagai Secret), tidak pernah terlihat di HP pengguna.
//
// Variabel yang perlu diisi di Cloudflare (Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (Secret)  → API key dari console.anthropic.com
//   ACCESS_CODE        (Secret)  → kode akses yang kamu bagikan ke pengguna, mis. "kalori2026"
//   ALLOWED_ORIGIN     (Text)    → URL aplikasi, mis. "https://namakamu.github.io"  (isi "*" saat uji coba)

const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 800;           // jawaban JSON biasanya 200–400 token
const MAX_BODY = 1_500_000;       // tolak request > ~1,5 MB (foto sudah dikecilkan di aplikasi)

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
      "Access-Control-Max-Age": "86400",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    if (req.headers.get("X-Access-Code") !== env.ACCESS_CODE) return json({ error: "kode akses salah" }, 401);

    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "foto terlalu besar" }, 413);

    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "format" }, 400); }
    if (!Array.isArray(body.messages) || body.messages.length !== 1) return json({ error: "format" }, 400);

    // Model & batas token dikunci di server supaya tidak bisa disalahgunakan.
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages: body.messages }),
    });

    const data = await r.text();
    return new Response(data, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  },
};
