import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pcm16, useLiveSession } from '../useLiveSession';
import { readAudio, useVoiceInput, MAX_AUDIO_BYTES } from '../useVoiceInput';
import { useReviews } from '../useReviews';
import { chatHistory } from '@/components/ai/api';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('voice and review boundaries', () => {
  it('clips PCM samples instead of wrapping maximum positive volume negative', () => {
    const bytes = Uint8Array.from(atob(pcm16(new Float32Array([-2, -1, 0, 1, 2]))), character => character.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    expect(Array.from({ length: 5 }, (_, index) => view.getInt16(index * 2, true))).toEqual([-32768, -32768, 0, 32767, 32767]);
  });
  it('rejects empty or oversized audio before upload', async () => {
    await expect(readAudio(new Blob([]))).rejects.toThrow('No audio');
    await expect(readAudio(new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)]))).rejects.toThrow('2.1 MB');
    await expect(readAudio(new Blob(['audio'], { type: 'audio/unsupported' }))).rejects.toThrow('format is not supported');
  });
  it('bounds recent chat context and long assistant responses to the server contract', () => {
    const history = Array.from({ length: 35 }, (_, index) => ({ role: index % 2 ? 'assistant' as const : 'user' as const, content: 'x'.repeat(4500) }));
    const sent = chatHistory(history);
    expect(sent).toHaveLength(29);
    expect(sent[0].role).toBe('user');
    expect(sent.every(message => message.content.length === 4000)).toBe(true);
    expect(history[0].content).toHaveLength(4500);
  });
  it('stops microphone tracks if permission resolves after recording was unmounted', async () => {
    let allow!: (value: unknown) => void;
    const stop = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => new Promise(resolve => { allow = resolve; })) } });
    vi.stubGlobal('MediaRecorder', vi.fn());
    const { result, unmount } = renderHook(() => useVoiceInput(vi.fn()));
    let pending!: Promise<void>;
    act(() => { pending = result.current.startRecording(); });
    unmount();
    await act(async () => { allow({ getTracks: () => [{ stop }] }); await pending; });
    expect(stop).toHaveBeenCalledOnce();
  });
  it('reports denied live microphone access without requesting a token', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('AudioContext', vi.fn());
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) } });
    const { result } = renderHook(useLiveSession);
    await act(async () => { await result.current.startSession(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/denied/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('ignores malformed saved reviews and preserves consecutive additions', async () => {
    localStorage.setItem('phoneReviews', JSON.stringify({ Device: [{ author: 'Bad', comment: 'Bad', rating: 100 }] }));
    const { result } = renderHook(useReviews);
    await waitFor(() => expect(result.current.getReviewsForPhone('Device')).toEqual([]));
    act(() => {
      result.current.addReview('Device', { author: '', rating: 4, comment: ' First ' });
      result.current.addReview('Device', { author: '', rating: 2, comment: 'Second' });
    });
    expect(result.current.getReviewsForPhone('Device')).toHaveLength(2);
    expect(result.current.getAverageRatingForPhone('Device')).toBe(3);
    expect(result.current.getReviewsForPhone('Device')[0].author).toBe('Anonymous');
  });
  it('treats object-property names as ordinary phone names', () => {
    const { result } = renderHook(useReviews);
    expect(result.current.getReviewsForPhone('constructor')).toEqual([]);
    expect(result.current.getReviewsForPhone('__proto__')).toEqual([]);
    act(() => { result.current.addReview('constructor', { author: 'Owner', comment: 'Good.', rating: 4 }); });
    expect(result.current.getAverageRatingForPhone('constructor')).toBe(4);
    act(() => { result.current.addReview('__proto__', { author: 'Owner', comment: 'Good.', rating: 5 }); });
    expect(result.current.getAverageRatingForPhone('__proto__')).toBe(5);
  });
});
