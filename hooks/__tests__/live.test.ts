import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveServerMessage } from '@google/genai';
import { useLiveSession } from '../useLiveSession';

const sdk = vi.hoisted(() => ({ connect: vi.fn(), close: vi.fn(), sendRealtimeInput: vi.fn(), sendClientContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { live = { connect: sdk.connect }; }, Modality: { AUDIO: 'AUDIO' },
}));

const token = { token: 'ephemeral-test-token', model: 'live-model', apiVersion: 'v1alpha', config: { responseModalities: ['AUDIO'], inputAudioTranscription: {}, outputAudioTranscription: {} } };
const stop = vi.fn();
const contexts: FakeAudioContext[] = [];
class FakeAudioContext {
  sampleRate = 16000; state = 'running'; currentTime = 0;
  destination = {};
  close = vi.fn(async () => { this.state = 'closed'; });
  resume = vi.fn(async () => {});
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createScriptProcessor = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null }));
  constructor() { contexts.push(this); }
}

let callbacks: { onmessage: (message: LiveServerMessage) => void; onclose: () => void };
beforeEach(() => {
  vi.clearAllMocks(); contexts.length = 0;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => token }));
  sdk.connect.mockImplementation(async (options: { callbacks: typeof callbacks }) => {
    callbacks = options.callbacks;
    return { close: sdk.close, sendRealtimeInput: sdk.sendRealtimeInput, sendClientContent: sdk.sendClientContent };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('live session lifecycle', () => {
  it('accumulates transcript fragments and waits for the actual summary marker', async () => {
    const { result, unmount } = renderHook(useLiveSession);
    await act(async () => { await result.current.startSession(); });
    expect(result.current.status).toBe('active');
    act(() => {
      callbacks.onmessage({ serverContent: { inputTranscription: { text: 'Long battery ' } } } as LiveServerMessage);
      callbacks.onmessage({ serverContent: { inputTranscription: { text: 'under my budget.' }, outputTranscription: { text: 'What is ' } } } as LiveServerMessage);
      result.current.requestSummary();
      callbacks.onmessage({ serverContent: { outputTranscription: { text: 'your budget?' }, turnComplete: true } } as LiveServerMessage);
    });
    expect(result.current.summary).toBe('');
    expect(result.current.status).toBe('active');
    expect(result.current.summarizing).toBe(true);
    expect(result.current.transcript[0].text).toBe('Long battery under my budget.');
    act(() => {
      callbacks.onmessage({ serverContent: { outputTranscription: { text: 'A phone with long battery life. SESSION_' } } } as LiveServerMessage);
      callbacks.onmessage({ serverContent: { outputTranscription: { text: 'END' }, turnComplete: true } } as LiveServerMessage);
    });
    expect(result.current.summary).toBe('A phone with long battery life.');
    expect(result.current.status).toBe('ended');
    expect(stop).toHaveBeenCalled();
    unmount();
    expect(sdk.close).toHaveBeenCalled();
    expect(contexts.every(context => context.close.mock.calls.length > 0)).toBe(true);
  });

  it('cancels a pending token request and never connects a late response', async () => {
    let finish!: (value: unknown) => void;
    const fetchMock = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(useLiveSession);
    let pending!: Promise<void>;
    act(() => { pending = result.current.startSession(); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const signal = (fetchMock.mock.calls as unknown as [string, { signal: AbortSignal }][])[0][1].signal;
    act(() => result.current.endSession());
    expect(signal.aborted).toBe(true);
    await act(async () => { finish({ ok: true, json: async () => token }); await pending; });
    expect(sdk.connect).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(result.current.status).toBe('ended');
  });
});
