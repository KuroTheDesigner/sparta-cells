// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { generateContent, createToken } = vi.hoisted(() => ({ generateContent: vi.fn(), createToken: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent }; authTokens = { create: createToken }; },
  Modality: { AUDIO: 'AUDIO' },
  ThinkingLevel: { LOW: 'LOW', HIGH: 'HIGH' },
}));
import { searchPhones, recommendPhones, chat, liveToken, stores } from './gemini';
import { post } from './http';
import { searchInput, chatInput, recommendationInput, tokenInput } from './validation';
import { exactModelTitle, modelIdentity, resolvePhoneImage, resolveGroundingSources } from './images';
import rawPhones from '../../data/phones.raw.json';
import { normalizePhones } from '../normalize';

const phone = normalizePhones(rawPhones)[0];
const fields = ['name', 'price', 'cpu', 'batteryMah', 'screen.tech', 'screen.sizeIn', 'screen.resolution', 'cameras.rear', 'cameras.frontMp', 'refreshHz', 'chargingW', 'wirelessW', 'video', 'features.headphone', 'features.sim'];
const url = 'https://manufacturer.example/phone';
function fixture(name = phone.name, overrides = {}) {
  return { phone: { ...phone, name }, currency: 'NGN', notes: 'Local price estimate.', sourceUrls: [url], fieldSources: { ...Object.fromEntries(fields.map(f => [f, [url]])), latestGeneration: [] }, matchesAllConstraints: true, constraintEvidence: 'All constraints researched.', ...overrides };
}
function reply(body: unknown, title = `${phone.name} specifications`, refs = true) {
  return { text: JSON.stringify(body), candidates: [{ groundingMetadata: { groundingChunks: refs ? [{ web: { uri: url, title } }] : [] } }] };
}
function researchReply(candidates: unknown[], shortage = false, refs = true, requiredFields: string[] = [], exactTitles = false) {
  const names = candidates.map(c => (c as { phone: { name: string } }).phone.name);
  generateContent.mockImplementation(async ({ contents }) => {
    const prompt = contents[0].parts[0].text as string;
    if (prompt.startsWith('Discover')) return { text: JSON.stringify({ names, constraints: { priceMin: null, priceMax: null, brands: [], excludedBrands: [], series: [], releaseYearMin: null, releaseYearMax: null, excludeLatest: false, requiredFields }, shortage, message: 'Research limited.' }) };
    const name = JSON.parse(prompt.match(/(?:smartphone models|real models): (\[[^\]]+\])/ )![1])[0];
    const candidate = candidates.find(c => (c as { phone: { name: string } }).phone.name === name);
    return reply({ candidates: [candidate] }, `${exactTitles ? name : phone.name} specifications`, refs);
  });
}
beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'test-only-value'); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('grounded phone research', () => {
  it('admits sourced broad models with unknown price but rejects them when price is required', async () => {
    const candidate = fixture(phone.name, { fieldSources: { name: [url], price: [] }, notes: 'Unsupported guess: NGN 123456.' });
    const input = { description: 'general use phones', country: 'Nigeria', currency: 'NGN' };
    researchReply([candidate]);
    const result = await searchPhones(input, new AbortController().signal);
    expect(result.phones).toHaveLength(1);
    expect(result.phones[0].price).toBeNull();
    expect(result.evidence[0].currency).toBeNull();
    expect(result.evidence[0].unknownFields).toContain('price');
    expect(result.evidence[0].fieldSources).not.toHaveProperty('price');
    expect(result.evidence[0].notes).not.toContain('123456');
    researchReply([candidate], false, true, ['price']);
    expect((await searchPhones({ ...input, description: 'show a sourced local price' }, new AbortController().signal)).phones).toEqual([]);
    researchReply([candidate]);
    expect((await searchPhones({ ...input, filters: { query: '', priceRange: [100, 1000], cpu: [], batteryMah: [], screenTech: [], refreshHz: [], chargingW: [], wireless: [] } }, new AbortController().signal)).phones).toEqual([]);
  });
  it('uses replacements for rejected candidates and stops scheduling once twenty are admitted', async () => {
    const candidates = Array.from({ length: 30 }, (_, index) => fixture(`Test Phone ${index}`, { currency: index < 5 ? 'USD' : 'NGN' }));
    researchReply(candidates, false, true, [], true);
    const result = await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones.length).toBeGreaterThanOrEqual(20);
    expect(result.status).toBe('complete');
    const attempts = generateContent.mock.calls.filter(([request]) => request.contents[0].parts[0].text.startsWith('Research ONLY')).length;
    expect(attempts).toBeGreaterThanOrEqual(25);
    expect(attempts).toBeLessThan(30);
  });
  it('permits unknown optional release metadata but requires it for a year constraint', async () => {
    researchReply([fixture(phone.name, { releaseYear: null, latestGeneration: null, brand: null, series: null })]);
    const input = { description: 'phones', country: 'Nigeria', currency: 'NGN' };
    expect((await searchPhones(input, new AbortController().signal)).phones).toHaveLength(1);
    generateContent.mockImplementationOnce(async () => ({ text: JSON.stringify({ names: [phone.name], constraints: { priceMin: null, priceMax: null, brands: [], excludedBrands: [], series: [], releaseYearMin: 2024, releaseYearMax: null, excludeLatest: false }, shortage: false, message: '' }) }));
    expect((await searchPhones({ ...input, description: 'released since 2024' }, new AbortController().signal)).phones).toEqual([]);
  });
  it('does not readmit a rejected mixed Product page through its provider title', async () => {
    const name = phone.name;
    const sourceUrl = 'https://slot.ng/products/mixed';
    generateContent.mockImplementation(async ({ contents }) => contents[0].parts[0].text.startsWith('Discover')
      ? { text: JSON.stringify({ names: [name], constraints: { priceMin: null, priceMax: null, brands: [], excludedBrands: [], series: [], releaseYearMin: null, releaseYearMax: null, excludeLatest: false }, shortage: false, message: '' }) }
      : { text: JSON.stringify({ candidates: [fixture(name)] }), candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: sourceUrl, title: name } }] } }] });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(`<title>${name}</title><script type="application/ld+json">${JSON.stringify([{ '@type': 'Product', name }, { '@type': 'Product', name: `${name} Ultra` }])}</script>`, { headers: { 'Content-Type': 'text/html' } })));
    const result = await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones).toEqual([]);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
  it('assigns retrieved source URLs itself and keeps used prices out of new-only results', async () => {
    let newOnly = false;
    const name = 'Samsung Galaxy S24';
    const sourceUrl = 'https://slot.ng/products/pre-owned-samsung-galaxy-s24-256gb';
    const candidate = fixture(name, { sourceUrls: ['https://attacker.example/invented'], fieldSources: { name: [0], price: [0] } });
    generateContent.mockImplementation(async ({ contents }) => contents[0].parts[0].text.startsWith('Discover')
      ? { text: JSON.stringify({ names: [name], constraints: { priceMin: null, priceMax: null, brands: [], excludedBrands: [], series: [], releaseYearMin: null, releaseYearMax: null, excludeLatest: false, newOnly }, shortage: false, message: '' }) }
      : { text: JSON.stringify({ candidates: [candidate] }), candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: sourceUrl, title: 'slot.ng' } }] } }] });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('<title>Samsung Galaxy S24 5G</title><script type="application/ld+json">{"@type":"Product","name":"PRE-OWNED SAMSUNG GALAXY S24 256GB","offers":{"itemCondition":"https://schema.org/NewCondition"}}</script>', { headers: { 'Content-Type': 'text/html' } })));
    const input = { description: 'phones', country: 'Nigeria', currency: 'NGN' };
    const result = await searchPhones(input, new AbortController().signal);
    expect(result.phones).toHaveLength(1);
    expect(result.evidence[0].fieldSources?.price[0].url).toBe(sourceUrl);
    expect(result.evidence[0].notes).toContain('pre-owned');
    expect(JSON.stringify(result)).not.toContain('attacker.example');
    newOnly = true;
    expect((await searchPhones({ ...input, description: 'new phones only' }, new AbortController().signal)).phones).toEqual([]);
  });
  it('validates and preserves the currency of assistant table prices', async () => {
    const recommendation = { priorities: 'budget', phones: [phone] };
    const conversation = { messages: [{ role: 'user', content: 'Which is affordable?' }], phones: [phone] };
    expect(recommendationInput.parse(recommendation).currency).toBe('NGN');
    expect(chatInput.parse(conversation).currency).toBe('NGN');
    expect(chatInput.safeParse({ ...conversation, currency: 'usd' }).success).toBe(false);
    expect(recommendationInput.safeParse({ ...recommendation, currency: 'USD extra' }).success).toBe(false);
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ primary: null, runnerUp: null }) });
    await recommendPhones(recommendationInput.parse({ ...recommendation, currency: 'USD' }), new AbortController().signal);
    expect(generateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    expect(generateContent.mock.calls[0][0].contents[0].parts[0].text).toContain('prices are denominated in USD');
    generateContent.mockResolvedValueOnce({ text: 'Compare the USD prices.' });
    await chat(chatInput.parse({ ...conversation, currency: 'USD' }), new AbortController().signal);
    expect(generateContent.mock.calls[1][0].contents[0].parts[0].text).toContain('prices are denominated in USD');
  });
  it('deduplicates models, rejects unsourced/missing fields and reports incomplete research honestly', async () => {
    researchReply([fixture(), fixture(), fixture('Invented Phone'), fixture(phone.name, { phone: { name: phone.name } })]);
    const result = await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones).toEqual([phone]);
    expect(result.status).toBe('partial');
    expect(result.requestedCount).toBe(20);
    expect(result.constraintsRelaxed).toBe(false);
    expect(result.evidence[0].imageUrl).toBeNull();
    expect(generateContent.mock.calls[0][0].contents[0].parts[0].text).toContain('40 DISTINCT');
    expect(generateContent.mock.calls[0][0].config.thinkingConfig.thinkingLevel).toBe('LOW');
    expect(generateContent.mock.calls[1][0].config.thinkingConfig.thinkingLevel).toBe('LOW');
  });
  it('does not admit models without provider grounding even when the model fabricates source URLs', async () => {
    researchReply([fixture()], true, false);
    const result = await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones).toEqual([]);
    expect(result.status).toBe('unverified');
  });
  it('retains sourced identity and price while replacing unsupported specs with null, and excludes unknown required features', async () => {
    const candidate = fixture(phone.name, { fieldSources: { name: [url], price: [url], wirelessW: [], latestGeneration: [] } });
    researchReply([candidate]);
    const input = { description: 'phones', country: 'Nigeria', currency: 'NGN' };
    const result = await searchPhones(input, new AbortController().signal);
    expect(result.phones).toHaveLength(1);
    expect(result.phones[0].wirelessW).toBeNull();
    expect(result.phones[0].features.headphone).toBeNull();
    expect(result.phones[0].cpu).toBeNull();
    expect(result.evidence[0].unknownFields).toContain('wirelessW');
    expect(result.evidence[0].fieldSources?.price[0].url).toBe(url);
    researchReply([candidate], false, true, ['wirelessW']);
    expect((await searchPhones({ ...input, description: 'wireless charging required' }, new AbortController().signal)).phones).toEqual([]);
  });
  it('enforces existing numeric filters and currency instead of silently widening requirements', async () => {
    researchReply([fixture()], true);
    const result = await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN', filters: { query: '', priceRange: [0, 0], cpu: [], batteryMah: [], screenTech: [], refreshHz: [], chargingW: [], wireless: [] } }, new AbortController().signal);
    expect(result.phones).toEqual([]);
    researchReply([fixture(phone.name, { currency: 'USD' })], true);
    expect((await searchPhones({ description: 'phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal)).phones).toEqual([]);
  });
  it('rejects fabricated recommendation names', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ primary: { name: 'Fabricated', justification: 'fast' }, runnerUp: null }) });
    await expect(recommendPhones({ priorities: 'battery', phones: [phone] }, new AbortController().signal)).rejects.toThrow('unavailable phone');
  });
  it('enforces the budget extracted from the natural-language request', async () => {
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ names: [phone.name], constraints: { priceMin: null, priceMax: 1, brands: [], excludedBrands: [], series: [], releaseYearMin: null, releaseYearMax: null, excludeLatest: false }, shortage: false, message: '' }) });
    generateContent.mockResolvedValueOnce(reply({ candidates: [fixture()] }));
    generateContent.mockResolvedValueOnce(reply({ candidates: [fixture()] }));
    const result = await searchPhones({ description: 'phones under 1 naira', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones).toEqual([]);
    expect(result.constraintsRelaxed).toBe(false);
  });
  it('produces a complete twenty-model result through bounded discovery and spec batches when evidence supports it', async () => {
    // Synthetic provider fixtures exercise batching/counting; these are not live spec evidence.
    const names = ['Samsung Galaxy S24', 'Samsung Galaxy S24 Plus', 'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S23', 'Samsung Galaxy S23 Plus', 'Samsung Galaxy S23 Ultra', 'Samsung Galaxy A55', 'Samsung Galaxy A35', 'Google Pixel 8', 'Google Pixel 8 Pro', 'Google Pixel 7', 'Google Pixel 7 Pro', 'Apple iPhone 15', 'Apple iPhone 15 Plus', 'Apple iPhone 15 Pro', 'Apple iPhone 15 Pro Max', 'OnePlus 12', 'OnePlus 11', 'Xiaomi 14', 'Xiaomi 13'];
    const candidates = names.map(name => fixture(name, { sourceUrls: [url], fieldSources: Object.fromEntries(fields.map(f => [f, [0]])) }));
    researchReply(candidates, false, true, [], true);
    const result = await searchPhones({ description: 'broad current and recent phones', country: 'Nigeria', currency: 'NGN' }, new AbortController().signal);
    expect(result.phones).toHaveLength(20);
    expect(result.status).toBe('complete');
    expect(generateContent).toHaveBeenCalledTimes(41);
  });
  it('does not convert a web search result into a verified Maps store', async () => {
    generateContent.mockResolvedValue(reply({ stores: [{ name: 'Store', placeId: 'made-up', mapsUrl: url }] }));
    expect((await stores({ phoneName: phone.name, location: 'Lagos' }, new AbortController().signal)).stores).toEqual([]);
  });
});

describe('exact model image provenance', () => {
  it('uses a single Product record for exact identity, condition and the trusted SLOT image', async () => {
    const source = { title: 'slot.ng', url: 'https://slot.ng/products/s24' };
    const product = { '@type': 'Product', name: 'PRE-OWNED SAMSUNG GALAXY S24 256GB', image: ['https://api-prod.slot.ng/storage/s24.webp'], offers: { price: 589900, priceCurrency: 'NGN', itemCondition: 'https://schema.org/NewCondition' } };
    const html = (data: unknown) => `<title>Samsung Galaxy S24 5G Smartphone</title><script type="application/ld+json">${JSON.stringify(data)}</script>`;
    const fetcher = vi.fn().mockImplementation(async () => new Response(html(product), { headers: { 'Content-Type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    const [resolved] = await resolveGroundingSources([source], new AbortController().signal);
    expect(resolved.source.title).toBe(product.name);
    expect(exactModelTitle(resolved.source.title, 'Samsung Galaxy S24')).toBe(true);
    expect(resolved.condition).toBe('used');
    expect(resolved.content).toContain('589900');
    expect(resolved.imageUrl).toBe(product.image[0]);
    fetcher.mockImplementation(async () => new Response(html([product, { ...product, name: 'Samsung Galaxy S24 Ultra' }]), { headers: { 'Content-Type': 'text/html' } }));
    expect(await resolveGroundingSources([source], new AbortController().signal)).toEqual([]);
    fetcher.mockImplementation(async () => new Response(html({ ...product, name: 'Samsung Galaxy S24 Ultra' }), { headers: { 'Content-Type': 'text/html' } }));
    expect((await resolvePhoneImage('Samsung Galaxy S24', [{ ...source, title: 'Samsung Galaxy S24' }], new AbortController().signal)).imageUrl).toBeNull();
    fetcher.mockImplementation(async () => new Response('<title>Samsung Galaxy S24</title><script type="application/ld+json">{broken</script>', { headers: { 'Content-Type': 'text/html' } }));
    const [malformed] = await resolveGroundingSources([source], new AbortController().signal);
    expect(malformed.source.title).toBe('Samsung Galaxy S24');
    expect(malformed.content).not.toContain('589900');
    expect(malformed.imageUrl).toBeNull();
  });
  it('rejects sibling model titles and collapses storage/color variants', () => {
    expect(exactModelTitle('Samsung Galaxy S24 Ultra - specs', 'Samsung Galaxy S24')).toBe(false);
    expect(exactModelTitle('Samsung Galaxy S24+ specifications', 'Samsung Galaxy S24')).toBe(false);
    expect(modelIdentity('Samsung Galaxy S24+')).toBe('samsung galaxy s24 plus');
    expect(modelIdentity('Samsung Galaxy S24+')).not.toBe(modelIdentity('Samsung Galaxy S24'));
    expect(exactModelTitle('Samsung Galaxy S24 and S24 Ultra', 'Samsung Galaxy S24')).toBe(false);
    expect(exactModelTitle('Samsung Galaxy S24 / S24 Ultra', 'Samsung Galaxy S24')).toBe(false);
    expect(exactModelTitle('Best Samsung Galaxy S24 phones comparison', 'Samsung Galaxy S24')).toBe(false);
    expect(exactModelTitle('Samsung Galaxy S24+ specifications', 'Samsung Galaxy S24 Plus')).toBe(true);
    expect(exactModelTitle('Oneplus 13 - 6.82" (16GB RAM, 512GB ROM) Android 15 (50/50/50)MP - Black', 'OnePlus 13')).toBe(true);
    expect(exactModelTitle('Samsung Galaxy S24, Galaxy S24 Ultra', 'Samsung Galaxy S24')).toBe(false);
    expect(exactModelTitle('Google Pixel 8 Pro specs', 'Google Pixel 8')).toBe(false);
    expect(exactModelTitle('Google Pixel 8 specs', 'Google Pixel 8')).toBe(true);
    expect(modelIdentity('Samsung Galaxy S24 256GB Black')).toBe('samsung galaxy s24');
    expect(modelIdentity('Samsung Galaxy S24 128GB Blue')).toBe('samsung galaxy s24');
  });
  it('returns an allowlisted product og:image with the fetched exact model page as provenance', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('<title>Samsung Galaxy S24 specifications</title><meta property="og:image" content="https://images.samsung.com/s24.jpg">', { headers: { 'Content-Type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    const source = { title: 'Samsung Galaxy S24', url: 'https://www.samsung.com/phones/galaxy-s24/' };
    const result = await resolvePhoneImage('Samsung Galaxy S24', [source], new AbortController().signal);
    expect(result.imageUrl).toBe('https://images.samsung.com/s24.jpg');
    expect(result.imageSource?.url).toBe(source.url);
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
  });
  it('blocks untrusted URLs and redirects to internal hosts, and does not substitute a sibling image', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 302, headers: { Location: 'http://127.0.0.1/secrets' } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await resolvePhoneImage('Samsung Galaxy S24', [{ title: 'Samsung Galaxy S24', url: 'https://www.samsung.com/s24/' }, { title: 'Samsung Galaxy S24', url: 'https://attacker.example/s24/' }], new AbortController().signal);
    expect(result.imageUrl).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(new Response('<title>Samsung Galaxy S24 Ultra specs</title><meta property="og:image" content="https://images.samsung.com/ultra.jpg">', { headers: { 'Content-Type': 'text/html' } }));
    expect((await resolvePhoneImage('Samsung Galaxy S24', [{ title: 'Samsung Galaxy S24', url: 'https://www.samsung.com/s24/' }], new AbortController().signal)).imageUrl).toBeNull();
  });
});

describe('API boundary', () => {
  it('checks the public Host when Next uses an internal URL and still rejects cross-site requests', async () => {
    const handler = post(tokenInput, async () => ({ ok: true }));
    const request = (origin: string, extra = {}) => new Request('http://0.0.0.0:3002/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: 'sparta.example', 'X-Forwarded-Proto': 'https', Origin: origin, ...extra }, body: '{}' });
    expect((await handler(request('https://sparta.example'))).status).toBe(200);
    expect((await handler(request('https://evil.example'))).status).toBe(403);
    expect((await handler(request('https://sparta.example', { Host: 'different.example' }))).status).toBe(403);
    expect((await handler(request('https://sparta.example', { 'Sec-Fetch-Site': 'cross-site' }))).status).toBe(403);
  });
  it('rejects malformed, oversized, cross-origin and unknown-field requests before making model calls', async () => {
    const run = vi.fn();
    const handler = post(searchInput, run);
    const valid = { description: 'phones', country: 'Nigeria', currency: 'NGN' };
    const request = (body: string, headers = {}) => new Request('https://sparta.example/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
    expect((await handler(request('{'))).status).toBe(400);
    expect((await handler(request(JSON.stringify({ ...valid, apiKey: 'do-not-accept' })))).status).toBe(400);
    expect((await handler(request(JSON.stringify(valid), { Origin: 'https://evil.example' }))).status).toBe(403);
    expect((await handler(request('{}', { 'Content-Length': '9999999' }))).status).toBe(413);
    expect(run).not.toHaveBeenCalled();
  });
  it('sanitizes upstream failures and propagates request cancellation', async () => {
    const handler = post(tokenInput, async () => { throw new Error('secret-api-key raw upstream body'); });
    const res = await handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('secret-api-key');
    const controller = new AbortController(); controller.abort();
    const aborted = await handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal }));
    expect(aborted.status).toBe(499);
  });
  it('maps provider quota errors to recovery guidance without exposing provider contents', async () => {
    const handler = post(tokenInput, async () => { throw Object.assign(new Error('secret-provider-body'), { status: 429 }); });
    const result = await handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
    expect(result.status).toBe(429);
    const body = await result.json();
    expect(body.error.code).toBe('QUOTA_EXCEEDED');
    expect(JSON.stringify(body)).not.toContain('secret-provider-body');
  });
  it('validates recorded audio and bounds coordinate-independent input', () => {
    const context = { messages: [{ role: 'user', content: 'audio question' }], phones: [] };
    expect(chatInput.safeParse({ ...context, audio: { data: 'YQ==', mimeType: 'audio/webm' } }).success).toBe(true);
    expect(chatInput.safeParse({ ...context, audio: { data: 'not-base64', mimeType: 'text/html' } }).success).toBe(false);
  });
  it('ends a stalled provider operation at the deadline and forwards its abort signal', async () => {
    vi.useFakeTimers();
    let providerSignal: AbortSignal | undefined;
    const handler = post(tokenInput, async (_, signal) => { providerSignal = signal; return new Promise(() => {}); });
    const pending = handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
    await vi.advanceTimersByTimeAsync(230_001);
    expect((await pending).status).toBe(504);
    expect(providerSignal?.aborted).toBe(true);
  });
  it('issues only single-use, short-lived, model-constrained live tokens', async () => {
    createToken.mockResolvedValue({ name: 'ephemeral-test-token' });
    const result = await liveToken({}, new AbortController().signal);
    const config = createToken.mock.calls[0][0].config;
    expect(config.uses).toBe(1);
    expect(result.model).toBe('gemini-3.8-live');
    expect(result.apiVersion).toBe('v1beta');
    expect(config.liveConnectConstraints.model).toBe(result.model);
    expect(config.liveConnectConstraints.config.systemInstruction).toContain('SESSION_END');
    expect(Date.parse(result.newSessionExpireTime) - Date.now()).toBeLessThanOrEqual(60_000);
    expect(result).not.toHaveProperty('apiKey');
  });
  it('limits token provisioning even when forwarded IP headers are spoofed', async () => {
    const handler = post(tokenInput, async () => ({}), true);
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `1.1.1.${i}` }, body: '{}' }))).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
  it('caps the combined request budget without trusting caller-provided identities', async () => {
    vi.useFakeTimers({ now: Date.now() + 24 * 60 * 60_000 });
    const handler = post(tokenInput, async () => ({}));
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await handler(new Request('https://sparta.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `1.1.1.${i}` }, body: '{}' }))).status);
    expect(statuses.slice(0, 30)).toEqual(Array(30).fill(200));
    expect(statuses[30]).toBe(429);
  });
});
