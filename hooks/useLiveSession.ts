'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GoogleGenAI, LiveServerMessage } from '@google/genai';
import type { LiveTokenResponse } from '@/lib/ai/types';
import { postAI } from '@/components/ai/api';

type LiveSession = Awaited<ReturnType<GoogleGenAI['live']['connect']>>;
export type TranscriptEntry = { speaker: 'user' | 'model'; text: string };

export function pcm16(data: Float32Array): string {
  const bytes = new Uint8Array(data.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < data.length; i++) {
    const value = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePCM(data: string, context: AudioContext, sampleRate = 24000) {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const buffer = context.createBuffer(1, Math.floor(bytes.length / 2), sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
  return buffer;
}

export function useLiveSession() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'ended' | 'error'>('idle');
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const session = useRef<LiveSession | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const input = useRef<AudioContext | null>(null);
  const output = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const inputSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  const nextTime = useRef(0);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const summaryRequested = useRef(false);
  const outputTurn = useRef('');
  const drainTimer = useRef<ReturnType<typeof setTimeout>>();
  const summaryTimer = useRef<ReturnType<typeof setTimeout>>();
  const finishing = useRef(false);
  const turn = useRef(0);
  const entries = useRef<(TranscriptEntry & { turn: number })[]>([]);

  const clearPlayback = useCallback(() => {
    sources.current.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
    sources.current.clear(); nextTime.current = 0;
  }, []);

  const cleanup = useCallback(() => {
    clearTimeout(drainTimer.current); clearTimeout(summaryTimer.current); finishing.current = false;
    generation.current++; pending.current = false;
    controller.current?.abort(); controller.current = null;
    if (processor.current) { processor.current.onaudioprocess = null; processor.current.disconnect(); processor.current = null; }
    inputSource.current?.disconnect(); inputSource.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    const connected = session.current; session.current = null;
    try { connected?.close(); } catch { /* Socket may already be closed. */ }
    clearPlayback();
    for (const context of [input.current, output.current]) if (context && context.state !== 'closed') void context.close().catch(() => {});
    input.current = null; output.current = null;
  }, [clearPlayback]);
  useEffect(() => cleanup, [cleanup]);

  async function startSession() {
    if (pending.current || (session.current && !finishing.current)) return;
    cleanup(); const id = generation.current;
    pending.current = true; setStatus('connecting'); setError(''); setSummary(''); setTranscript([]); setSummarizing(false);
    summaryRequested.current = false; outputTurn.current = ''; entries.current = []; turn.current = 0;
    controller.current = new AbortController();
    const fail = (message: string) => { if (id === generation.current) { cleanup(); setError(message); setStatus('error'); setSummarizing(false); } };
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') throw new Error('Live voice needs microphone access in a supported browser over HTTPS.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (id !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      input.current = new AudioContext({ sampleRate: 16000 });
      output.current = new AudioContext({ sampleRate: 24000 });
      await Promise.all([input.current.resume(), output.current.resume()]);
      const [token, sdk] = await Promise.all([
        postAI<LiveTokenResponse>('live-token', {}, controller.current.signal), import('@google/genai'),
      ]);
      if (id !== generation.current) return;
      const ai = new sdk.GoogleGenAI({ apiKey: token.token, httpOptions: { apiVersion: token.apiVersion } });
      const connected = await ai.live.connect({
        model: token.model,
        config: { ...token.config, responseModalities: [sdk.Modality.AUDIO] },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (id !== generation.current || finishing.current) return;
            const content = message.serverContent;
            if (!content) return;
            const append = (speaker: 'user' | 'model', text?: string) => {
              if (!text) return;
              const last = entries.current.at(-1);
              if (last?.speaker === speaker && last.turn === turn.current) last.text += text;
              else entries.current.push({ speaker, text, turn: turn.current });
              setTranscript(entries.current.map(({ speaker: role, text: value }) => ({ speaker: role, text: value.replace(/SESSION_END/g, '').trim() })));
            };
            append('user', content.inputTranscription?.text);
            append('model', content.outputTranscription?.text);
            outputTurn.current += content.outputTranscription?.text || '';
            if (content.interrupted) { clearPlayback(); outputTurn.current = ''; turn.current++; }
            for (const part of content.modelTurn?.parts || []) {
              const audio = part.inlineData;
              if (!audio?.data || !audio.mimeType?.startsWith('audio/') || !output.current) continue;
              try {
                const context = output.current;
                const rate = Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] || 24000);
                const buffer = decodePCM(audio.data, context, rate);
                const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
                const at = Math.max(nextTime.current, context.currentTime);
                source.onended = () => sources.current.delete(source);
                sources.current.add(source); source.start(at); nextTime.current = at + buffer.duration;
              } catch { fail('Voice playback failed. Stop and reconnect, or continue with text chat.'); return; }
            }
            if (content.turnComplete) {
              const complete = outputTurn.current;
              outputTurn.current = ''; turn.current++;
              if (complete.includes('SESSION_END')) {
                const result = complete.replace(/SESSION_END/g, '').trim();
                if (result) setSummary(result);
                clearTimeout(summaryTimer.current);
                summaryRequested.current = false; setSummarizing(false);
                if (processor.current) { processor.current.onaudioprocess = null; processor.current.disconnect(); }
                inputSource.current?.disconnect();
                stream.current?.getTracks().forEach(track => track.stop());
                if (input.current?.state !== 'closed') void input.current?.close().catch(() => {});
                input.current = null;
                finishing.current = true;
                setStatus('ended');
                // Keep only output alive until the spoken summary finishes.
                const remaining = Math.max(0, nextTime.current - (output.current?.currentTime || 0));
                drainTimer.current = setTimeout(cleanup, (remaining + .15) * 1000);
              }
            }
          },
          onerror: () => fail('The live connection failed. Check your connection and retry. Your transcript is kept below.'),
          onclose: () => { if (id === generation.current && !finishing.current) { cleanup(); setStatus('ended'); setSummarizing(false); } },
        },
      });
      if (id !== generation.current) { connected.close(); return; }
      session.current = connected; pending.current = false;
      const context = input.current!;
      const source = context.createMediaStreamSource(media); inputSource.current = source;
      // ponytail: native ScriptProcessor keeps this portable; move capture to AudioWorklet if main-thread load causes audio gaps.
      const capture = context.createScriptProcessor(4096, 1, 1); processor.current = capture;
      capture.onaudioprocess = event => {
        if (id !== generation.current || !session.current) return;
        try { session.current.sendRealtimeInput({ audio: { data: pcm16(event.inputBuffer.getChannelData(0)), mimeType: `audio/pcm;rate=${context.sampleRate}` } }); }
        catch { fail('The live connection was interrupted. Reconnect to continue.'); }
      };
      source.connect(capture); capture.connect(context.destination);
      setStatus('active');
      connected.sendClientContent({ turns: 'Help me choose my next phone. Ask me about my budget, location, priorities, and use cases, one question at a time. When I request a summary, provide only a concise paragraph of my requirements, followed by SESSION_END.', turnComplete: true });
    } catch (cause) {
      fail(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in browser settings or continue with text chat.' : 'Live voice could not start. Check microphone access and your connection, then retry.');
    }
  }

  function requestSummary() {
    if (!session.current || summaryRequested.current) return;
    summaryRequested.current = true; setSummarizing(true); outputTurn.current = '';
    // Pause microphone while the final requirements summary is prepared.
    if (processor.current) processor.current.onaudioprocess = null;
    stream.current?.getTracks().forEach(track => track.stop());
    try {
      session.current.sendRealtimeInput({ audioStreamEnd: true });
      session.current.sendClientContent({ turns: 'Summarize only my phone requirements in one concise paragraph. End with SESSION_END.', turnComplete: true });
      summaryTimer.current = setTimeout(() => {
        cleanup(); setStatus('error'); setSummarizing(false);
        setError('The summary did not finish. Use your spoken requirements below or start a new conversation.');
      }, 30000);
    } catch { cleanup(); setStatus('error'); setSummarizing(false); setError('The summary request failed. You can copy your transcript into the search field.'); }
  }
  function endSession() { cleanup(); setStatus('ended'); setSummarizing(false); }
  return { status, error, transcript, summary, summarizing, startSession, endSession, requestSummary };
}
