// Busca a foto de um jogador a partir do link da página (Transfermarkt /
// zerozero) ou de um URL de imagem direto. Lê a meta tag og:image da
// página e devolve a imagem como data URL.
//
// Allowlist estrita de domínios para mitigar SSRF — só sites de futebol.
//
// O Transfermarkt usa anti-bot (Cloudflare) que costuma devolver 403 a
// pedidos de IPs de datacenter (como os da Vercel). Para esses casos há
// dois fallbacks:
//   1. Página bloqueada → resolve o og:image via microlink (unfurl).
//   2. CDN da imagem bloqueado → vai buscar a imagem (já validada) via
//      proxy de imagem weserv.

const PAGE_HOSTS = [
  "transfermarkt.com", "transfermarkt.pt", "transfermarkt.de",
  "transfermarkt.co.uk", "transfermarkt.es", "transfermarkt.fr",
  "transfermarkt.it", "transfermarkt.us", "zerozero.pt",
];
const IMG_HOSTS = [
  "img.a.transfermarkt.technology", "tmssl.akamaized.net", "zerozero.pt",
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_BYTES = 6 * 1024 * 1024;
const MICROLINK = "https://api.microlink.io/";
const IMG_PROXY = "https://images.weserv.nl/";

const hostAllowed = (host, list) =>
  list.some(h => host === h || host.endsWith("." + h));

function parseUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u;
}

async function fetchWithTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m && m[1]) return m[1].replace(/&amp;/g, "&");
  }
  return null;
}

// Fallback de página: quando o site bloqueia o fetch direto (403 anti-bot),
// deixa o microlink resolver a página e devolve-nos o og:image.
async function ogImageViaMicrolink(pageUrl) {
  const api = new URL(MICROLINK);
  api.searchParams.set("url", pageUrl);
  const headers = { Accept: "application/json" };
  if (process.env.MICROLINK_API_KEY) headers["x-api-key"] = process.env.MICROLINK_API_KEY;
  let res;
  try {
    res = await fetchWithTimeout(api.toString(), { headers }, 12000);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json || json.status !== "success") return null;
  return json.data?.image?.url || json.data?.logo?.url || null;
}

// Fallback de imagem: o URL já foi validado contra IMG_HOSTS; se o CDN
// recusar o nosso IP, vamos buscá-la via proxy de imagem weserv.
async function fetchImageWithProxy(imageUrl) {
  try {
    const direct = await fetchWithTimeout(imageUrl, {
      headers: { "User-Agent": UA, Referer: "https://www.transfermarkt.com/" },
    });
    if (direct.ok) return direct;
  } catch { /* cai para o proxy */ }

  const prox = new URL(IMG_PROXY);
  prox.searchParams.set("url", imageUrl.replace(/^https?:\/\//, ""));
  return fetchWithTimeout(prox.toString(), { headers: { Accept: "image/*" } }, 12000);
}

export async function GET(req) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return Response.json({ error: "Falta o parâmetro url." }, { status: 400 });

  const target = parseUrl(raw);
  if (!target) return Response.json({ error: "URL inválido." }, { status: 400 });

  const isImage = hostAllowed(target.hostname, IMG_HOSTS);
  const isPage = hostAllowed(target.hostname, PAGE_HOSTS);
  if (!isImage && !isPage) {
    return Response.json({ error: "Domínio não suportado. Usa um link do Transfermarkt ou zerozero." }, { status: 400 });
  }

  try {
    let imageUrl = target.toString();

    if (isPage) {
      let og = null;
      try {
        const pageRes = await fetchWithTimeout(target.toString(), {
          headers: { "User-Agent": UA, "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8" },
        });
        if (pageRes.ok) og = extractOgImage(await pageRes.text());
      } catch { /* anti-bot ou timeout → fallback microlink */ }

      // Fallback: página bloqueada (403) ou sem og:image → unfurl.
      if (!og) og = await ogImageViaMicrolink(target.toString());

      if (!og) {
        return Response.json({ error: "Não foi encontrada foto nesta página." }, { status: 404 });
      }
      const ogUrl = parseUrl(og.startsWith("//") ? "https:" + og : og);
      if (!ogUrl || !hostAllowed(ogUrl.hostname, IMG_HOSTS)) {
        return Response.json({ error: "Origem da imagem não suportada." }, { status: 400 });
      }
      imageUrl = ogUrl.toString();
    }

    const imgRes = await fetchImageWithProxy(imageUrl);
    if (!imgRes.ok) {
      return Response.json({ error: `Imagem devolveu ${imgRes.status}.` }, { status: 502 });
    }
    const ct = (imgRes.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) {
      return Response.json({ error: "O link não aponta para uma imagem." }, { status: 400 });
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return Response.json({ error: "Imagem demasiado grande." }, { status: 413 });
    }
    const dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
    return Response.json({ dataUrl });
  } catch (err) {
    const msg = err?.name === "AbortError" ? "Tempo esgotado a obter a foto." : "Erro ao obter a foto.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
