import type { ChatMessage } from '@/lib/ai/types';

export function chatHistory(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-29).map(message => ({ role: message.role, content: message.content.slice(0, 4000) }));
}

export async function postAI<T>(route: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/ai/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || 'The assistant could not complete this request. Please try again.');
  if (!data) throw new Error('The assistant returned an empty response. Please try again.');
  return data as T;
}

export function safeUrl(value: string) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
