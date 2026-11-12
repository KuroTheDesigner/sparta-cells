import 'server-only';
import type { Source } from './types';

const pageHosts = new Set(['www.gsmarena.com', 'www.phonearena.com', 'www.apple.com', 'www.samsung.com', 'store.google.com', 'www.mi.com', 'www.oneplus.com', 'www.oppo.com', 'www.vivo.com', 'www.realme.com', 'www.tecno-mobile.com', 'www.infinixmobility.com', 'www.motorola.com', 'www.honor.com', 'www.sony.com', 'www.asus.com', 'nothing.tech']);
for (const retailer of ['www.jumia.com.ng', 'www.konga.com', 'slot.ng', 'www.slot.ng', 'www.pointekonline.com', 'www.kara.com.ng', 'www.justfones.ng', 'www.amazon.com', 'www.bestbuy.com']) pageHosts.add(retailer);
for (const host of [...pageHosts]) if (host.startsWith('www.')) pageHosts.add(host.slice(4));
pageHosts.add('m.gsmarena.com');
pageHosts.add('m.phonearena.com');
const imageHosts = new Set([...pageHosts, 'fdn2.gsmarena.com', 'm-cdn.phonearena.com', 'cdn.phonearena.com', 'images.samsung.com', 'image-us.samsung.com', 'images.samsung.com', 'www.apple.com', 'store.storeimages.cdn-apple.com', 'lh3.googleusercontent.com', 'i01.appmifile.com', 'image01.oneplus.net', 'image.oppo.com', 'asia-exstatic-vivofs.vivo.com']);
imageHosts.add('api-prod.slot.ng');
const redirectHosts = new Set([...pageHosts, 'vertexaisearch.cloud.google.com']);
export const normalizeModel = (s: string) => s.toLowerCase().replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();
export function modelIdentity(s: string) {
  return normalizeModel(s.replace(/\b\d+\s*\/\s*\d+\s*(gb|tb)\b/gi, '')).replace(/\b\d+\s*(gb|tb)\b/g, '').replace(/\s+(black|white|blue|green|red|silver|gold|gray|grey|purple|pink|titanium)\s*$/, '').replace(/\s+/g, ' ').trim();
}
export function exactModelTitle(title: string, name: string, sourceUrl?: string) {
  const normalized = normalizeModel(title);
  let identity = modelIdentity(name);
  const manufacturer = identity.split(' ')[0];
  const manufacturerDomains: Record<string, string> = { samsung: 'samsung.com', apple: 'apple.com', google: 'google.com', xiaomi: 'mi.com', oneplus: 'oneplus.com', oppo: 'oppo.com', vivo: 'vivo.com', realme: 'realme.com', tecno: 'tecno-mobile.com', infinix: 'infinixmobility.com', motorola: 'motorola.com', honor: 'honor.com', sony: 'sony.com', asus: 'asus.com' };
  // Official pages often omit their own brand in the title; the trusted host supplies it.
  if (sourceUrl && manufacturerDomains[manufacturer]) {
    const host = new URL(sourceUrl).hostname;
    const domain = manufacturerDomains[manufacturer];
    if ((host === domain || host.endsWith(`.${domain}`)) && !normalized.includes(manufacturer)) identity = identity.slice(manufacturer.length).trim();
  }
  const start = ` ${normalized} `.indexOf(` ${identity} `);
  if (start < 0 || /\b(vs|versus|comparison|compare|series|lineup|roundup|best|top)\b/.test(normalized) || /[,/&]\s*(samsung|apple|google|xiaomi|oneplus|galaxy|iphone|pixel|redmi|poco|oppo|vivo|realme|honor|sony|asus|motorola|[sa]\d|note\s*\d)/i.test(title)) return false;
  if (/\b(and|or)\s+(samsung|apple|google|xiaomi|oneplus|galaxy|iphone|pixel|redmi|poco|oppo|vivo|realme|honor|sony|asus|motorola|s\d|\d)/.test(normalized)) return false;
  const following = normalized.slice(start + identity.length).trim().split(' ')[0];
  // A base model must never borrow a Pro/Ultra/5G sibling's page or image.
  return !/^(pro|max|plus|ultra|lite|mini|fe|se|neo|prime|fold|flip|4g|5g|s|t|a|e|xl)$/.test(following);
}
function allowed(value: string, hosts: Set<string>): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.has(url.hostname); }
  catch { return false; }
}
function unescapeHtml(s: string) { return s.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n))); }
function meta(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = new Map(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs), m => [m[1].toLowerCase(), unescapeHtml(m[3])]));
    if ((attributes.get('property') || attributes.get('name'))?.toLowerCase() === key) return attributes.get('content');
  }
}
async function page(value: string, signal: AbortSignal): Promise<{ html: string; url: string } | null> {
  let url = value;
  for (let redirect = 0; redirect < 4; redirect++) {
    if (!allowed(url, redirectHosts) || (new URL(url).hostname === 'vertexaisearch.cloud.google.com' && !new URL(url).pathname.startsWith('/grounding-api-redirect/'))) return null;
    const response = await fetch(url, { signal, redirect: 'manual', cache: 'no-store', headers: { Accept: 'text/html' } });
    console.info('Product source fetch', { host: new URL(url).hostname, status: response.status, redirectHost: response.headers.get('location') ? new URL(response.headers.get('location')!, url).hostname : null });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) return null;
      url = new URL(location, url).href;
      continue;
    }
    if (!allowed(url, pageHosts) || !response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      console.info('Product source rejection', { allowedHost: allowed(url, pageHosts), ok: response.ok, html: !!response.headers.get('content-type')?.includes('text/html') });
      await response.body?.cancel(); return null;
    }
    const reader = response.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let html = '', length = 0;
    try {
      while (true) {
        const { value: bytes, done } = await reader.read();
        if (done) return { html: html + decoder.decode(), url };
        length += bytes.byteLength;
        if (length > 1_000_000) { await reader.cancel(); return null; }
        html += decoder.decode(bytes, { stream: true });
      }
    } finally { reader.releaseLock(); }
  }
  return null;
}

async function timedPage(value: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 3000);
  try { return await page(value, controller.signal); }
  finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}

export type ResolvedSource = { source: Source; aliases: string[]; imageUrl: string | null; content: string; condition: 'new' | 'used' | 'unknown' };
// JSON-LD is data, never executable HTML. Reject mixed-product pages entirely.
function pageMetadata(html: string, url: string) {
  const products: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (record['@type'] === 'Product' || (Array.isArray(record['@type']) && record['@type'].includes('Product'))) products.push(record);
    if (record['@graph']) visit(record['@graph']);
  };
  for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(script[1])); } catch { /* Malformed structured data cannot supply product facts. */ }
  }
  if (new Set(products.map(p => typeof p.name === 'string' ? modelIdentity(p.name) : '')).size > 1) return null;
  const product = products.find(p => typeof p.name === 'string' && p.name.length <= 500);
  const title = product?.name as string | undefined || meta(html, 'og:title') || unescapeHtml(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '');
  const content = JSON.stringify({ description: meta(html, 'description') || meta(html, 'og:description'), product: product ? { name: product.name, description: product.description, offers: product.offers } : undefined }).slice(0, 12000);
  const conditionText = `${title} ${JSON.stringify(product?.offers)}`;
  const condition = /pre[ -]?owned|refurbished|renewed|\bused\b|UsedCondition|RefurbishedCondition/i.test(conditionText) ? 'used' as const : /NewCondition|\bbrand new\b/i.test(conditionText) ? 'new' as const : 'unknown' as const;
  const productImage = Array.isArray(product?.image) ? product.image[0] : product?.image;
  const rawImage = typeof productImage === 'string' ? productImage : productImage && typeof productImage === 'object' && 'url' in productImage && typeof productImage.url === 'string' ? productImage.url : undefined;
  return { title, content, condition, imageUrl: imageFromPage(html, url, rawImage) };
}
function imageFromPage(html: string, url: string, productImage?: string) {
  const raw = productImage || meta(html, 'og:image');
  if (!raw) return null;
  try {
    const imageUrl = new URL(raw, url).href;
    return allowed(imageUrl, imageHosts) && !/\b(logo|placeholder|default|banner)\b/i.test(new URL(imageUrl).pathname) ? imageUrl : null;
  } catch { return null; }
}
export async function resolveGroundingSources(sources: Source[], signal: AbortSignal, rejected = new Set<string>()): Promise<ResolvedSource[]> {
  const results: ResolvedSource[] = [];
  const eligible = sources.filter(s => allowed(s.url, redirectHosts)).slice(0, 32);
  for (let i = 0; i < eligible.length; i += 4) await Promise.all(eligible.slice(i, i + 4).map(async source => {
    try {
      signal.throwIfAborted();
      const result = await timedPage(source.url, signal);
      if (!result) return;
      const metadata = pageMetadata(result.html, result.url);
      if (!metadata) { rejected.add(source.url); rejected.add(result.url); return; }
      if (metadata.title) results.push({ source: { title: metadata.title, url: result.url }, aliases: [source.url, result.url], imageUrl: metadata.imageUrl, content: metadata.content, condition: metadata.condition });
    } catch (error) { if (signal.aborted) throw signal.reason; console.info('Product source error', { name: error instanceof Error ? error.name : 'Error' }); }
  }));
  console.info('Gemini source resolution', { input: sources.length, eligible: eligible.length, resolved: results.length, inputHosts: [...new Set(sources.map(s => new URL(s.url).hostname))], resolvedHosts: [...new Set(results.map(s => new URL(s.source.url).hostname))] });
  return results;
}

export async function resolvePhoneImage(name: string, sources: Source[], signal: AbortSignal): Promise<{ imageUrl: string | null; imageSource: Source | null }> {
  const fallback = { imageUrl: null, imageSource: null };
  for (const source of sources.filter(s => allowed(s.url, redirectHosts) && exactModelTitle(s.title, name, s.url)).slice(0, 2)) {
    try {
      signal.throwIfAborted();
      const result = await timedPage(source.url, signal);
      if (!result) continue;
      const metadata = pageMetadata(result.html, result.url);
      if (!metadata || !exactModelTitle(metadata.title, name, result.url)) continue;
      const title = metadata.title;
      const imageUrl = metadata.imageUrl;
      if (!imageUrl) continue;
      return { imageUrl, imageSource: { title, url: result.url } };
    } catch { if (signal.aborted) throw signal.reason; }
  }
  return fallback;
}
