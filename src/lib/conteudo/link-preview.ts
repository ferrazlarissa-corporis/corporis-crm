type LinkPreview = {
  titulo: string | null;
  resumo: string | null;
  imagemUrl: string | null;
};

const EMPTY_PREVIEW: LinkPreview = { titulo: null, resumo: null, imagemUrl: null };

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function resolveUrl(base: string, maybeRelative: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

/** Busca og:title/og:description/og:image de um link pra virar miniatura no card da ideia. Nunca lança — falha vira preview vazio. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CorporisBot/1.0; +https://clinicacorporis.app)",
        Accept: "text/html",
      },
    });

    if (!response.ok) return EMPTY_PREVIEW;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return EMPTY_PREVIEW;

    const html = (await response.text()).slice(0, 300_000);
    const finalUrl = response.url || url;

    const titulo = extractMeta(html, "og:title") ?? extractTitleTag(html);
    const resumo = extractMeta(html, "og:description") ?? extractMeta(html, "description");
    const imagemRaw = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    const imagemUrl = imagemRaw ? resolveUrl(finalUrl, imagemRaw) : null;

    return {
      titulo: titulo ? titulo.slice(0, 160) : null,
      resumo: resumo ? resumo.slice(0, 400) : null,
      imagemUrl,
    };
  } catch {
    return EMPTY_PREVIEW;
  } finally {
    clearTimeout(timeout);
  }
}
