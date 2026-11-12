import 'server-only';
import { z } from 'zod';
import type { ApiError } from './types';

export class AiError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
export function providerError(error: unknown): AiError {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
  if (status === 429) return new AiError('QUOTA_EXCEEDED', 'Gemini quota or rate limit reached. Wait and try again; the server owner may need to check API billing and quota.', 429);
  if (status === 401 || status === 403) return new AiError('PROVIDER_AUTH_ERROR', 'Gemini rejected this server credential or its permissions. Ask the server owner to check GEMINI_API_KEY and API access.', 503);
  if (status === 404) return new AiError('MODEL_UNAVAILABLE', 'The configured Gemini model is unavailable. Ask the server owner to update GEMINI_MODEL or GEMINI_LIVE_MODEL.', 503);
  if (status === 400) return new AiError('PROVIDER_CONFIGURATION', 'Gemini rejected the model or tool configuration. The server owner needs to check model capabilities and API settings.', 503);
  if (status === 408 || status === 504 || (error instanceof Error && /timeout|timed out/i.test(error.name))) return new AiError('TIMEOUT', 'Gemini took too long to respond. Try a narrower request.', 504);
  return new AiError('UPSTREAM_ERROR', 'Gemini could not complete this request. Try again shortly.');
}

// ponytail: process-local total cost cap; use shared storage before scaling replicas.
const processState = globalThis as typeof globalThis & { spartaAiBudget?: { reset: number; requests: number; tokens: number; active: number } };
const budget = processState.spartaAiBudget ??= { reset: 0, requests: 0, tokens: 0, active: 0 };
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function response(body: unknown, status = 200) { return Response.json(body, { status, headers }); }

async function readBody(request: Request, signal: AbortSignal, limit: number): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AiError('INVALID_REQUEST', 'Send application/json.', 415);
  if (Number(request.headers.get('content-length')) > limit) throw new AiError('TOO_LARGE', 'Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AiError('INVALID_REQUEST', 'A JSON body is required.', 400);
  let length = 0;
  const chunks: Uint8Array[] = [];
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { cancel(); throw new AiError('TOO_LARGE', 'Request is too large.', 413); }
      chunks.push(value);
    }
    signal.throwIfAborted();
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new AiError('INVALID_REQUEST', 'Invalid JSON.', 400); }
  } finally { signal.removeEventListener('abort', cancel); reader.releaseLock(); }
}

export function post<T>(schema: z.ZodType<T>, run: (input: T, signal: AbortSignal) => Promise<unknown>, token = false) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    // Next can construct request.url with its internal bind hostname. Host is the public authority.
    const requestUrl = new URL(request.url);
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || requestUrl.protocol.slice(0, -1);
    const publicOrigin = `${protocol}://${request.headers.get('host') || requestUrl.host}`;
    if ((origin && origin !== publicOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') return response({ error: { code: 'FORBIDDEN', message: 'Use this service from the same site.' } }, 403);
    const now = Date.now();
    if (now >= budget.reset) { budget.reset = now + 60_000; budget.requests = 0; budget.tokens = 0; }
    if (budget.requests >= 30 || (token && budget.tokens >= 3) || budget.active >= 4) return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Please wait before trying again.' } }), { status: 429, headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': '60' } });
    budget.requests++; if (token) budget.tokens++; budget.active++;
    const controller = new AbortController();
    const abort = () => controller.abort(request.signal.reason);
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    const timer = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 230_000);
    let rejectOnAbort: (() => void) | undefined;
    const cancelled = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
    });
    try {
      const result = await Promise.race([(async () => {
        const input = schema.safeParse(await readBody(request, controller.signal, 3_200_000));
        if (!input.success) throw new AiError('INVALID_REQUEST', 'Please check the request fields and limits.', 400);
        controller.signal.throwIfAborted();
        return run(input.data, controller.signal);
      })(), cancelled]);
      controller.signal.throwIfAborted();
      return response(result);
    } catch (error) {
      const failure = controller.signal.aborted
        ? new AiError(request.signal.aborted ? 'CANCELLED' : 'TIMEOUT', request.signal.aborted ? 'Request cancelled.' : 'The AI request timed out. Try again.', request.signal.aborted ? 499 : 504)
        : error instanceof AiError ? error : providerError(error);
      return response({ error: { code: failure.code, message: failure.message } } satisfies ApiError, failure.status);
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', abort);
      if (rejectOnAbort) controller.signal.removeEventListener('abort', rejectOnAbort);
      budget.active--;
    }
  };
}
