'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioInput = { data: string; mimeType: string };
export const MAX_AUDIO_BYTES = 2_100_000;

export async function readAudio(file: Blob): Promise<AudioInput> {
  if (file.size > MAX_AUDIO_BYTES) throw new Error('Audio must be 2.1 MB or smaller. Record a shorter message.');
  if (!file.size) throw new Error('No audio was captured. Check your microphone and try again.');
  const mimeType = ({ 'audio/x-wav': 'audio/wav', 'audio/mp3': 'audio/mpeg' } as Record<string, string>)[file.type] || file.type || 'audio/webm';
  if (!['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/ogg;codecs=opus'].includes(mimeType)) throw new Error('Use WebM, MP4, WAV, MP3 or Ogg audio. This audio format is not supported.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The audio could not be read. Try another file.'));
    reader.onload = () => resolve({ data: String(reader.result).split(',')[1], mimeType });
    reader.readAsDataURL(file);
  });
}

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void;
};

export function useVoiceInput(onDictation: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [audio, setAudio] = useState<AudioInput | null>(null);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0);
  const onText = useRef(onDictation);
  onText.current = onDictation;

  const cancel = useCallback(() => {
    generation.current++;
    clearTimeout(timer.current);
    recognition.current?.abort(); recognition.current = null;
    if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state !== 'inactive') recorder.current.stop(); }
    recorder.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  async function startRecording() {
    if (recording || dictating) return;
    cancel(); const id = generation.current;
    setError(''); setAudio(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Audio recording needs a supported browser over HTTPS. You can attach an audio file instead.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      const chunks: Blob[] = [];
      let size = 0;
      instance.ondataavailable = event => {
        chunks.push(event.data); size += event.data.size;
        if (size > MAX_AUDIO_BYTES && instance.state !== 'inactive') instance.stop();
      };
      instance.onstop = async () => {
        clearTimeout(timer.current);
        media.getTracks().forEach(track => track.stop()); stream.current = null;
        if (id !== generation.current) return;
        setRecording(false);
        try { const result = await readAudio(new Blob(chunks, { type: instance.mimeType })); if (id === generation.current) setAudio(result); }
        catch (cause) { if (id === generation.current) setError(cause instanceof Error ? cause.message : 'Recording failed. Try again.'); }
      };
      instance.onerror = () => { cancel(); setRecording(false); setError('Recording failed. Check microphone access and retry.'); };
      instance.start(1000); setRecording(true);
      timer.current = setTimeout(() => { if (instance.state !== 'inactive') instance.stop(); }, 60000);
    } catch (cause) {
      if (id !== generation.current) return;
      cancel(); setRecording(false);
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in browser settings or type your message.' : cause instanceof Error ? cause.message : 'Microphone unavailable. Type your message or retry.');
    }
  }

  function startDictation() {
    if (recording || dictating) return;
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) { setError('Dictation is unavailable in this browser. Use Record audio or type your message.'); return; }
    cancel(); const id = generation.current;
    const instance = new Constructor(); recognition.current = instance;
    instance.lang = navigator.language || 'en-US'; instance.continuous = false; instance.interimResults = false;
    instance.onresult = event => { if (id === generation.current) onText.current(Array.from(event.results).map(result => result[0].transcript).join(' ')); };
    instance.onerror = event => { if (id === generation.current) { setDictating(false); setError(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it in browser settings or type your message.' : 'Dictation could not finish. Type your message or try again.'); } };
    instance.onend = () => { if (id === generation.current) setDictating(false); };
    setError('');
    try { instance.start(); setDictating(true); } catch { setError('Dictation could not start. Try Record audio instead.'); }
  }

  async function attach(file: File) {
    setError('');
    const id = generation.current;
    try {
      if (!file.type.startsWith('audio/')) throw new Error('Choose an audio file.');
      const result = await readAudio(file);
      if (id === generation.current) setAudio(result);
    } catch (cause) { if (id === generation.current) setError(cause instanceof Error ? cause.message : 'Audio could not be attached.'); }
  }
  return { recording, dictating, audio, error, startRecording, startDictation, attach,
    clearAudio: () => setAudio(null),
    stopRecording: () => { if (recorder.current?.state === 'recording') recorder.current.stop(); },
    stopDictation: () => recognition.current?.stop(),
    cancel: () => { cancel(); setRecording(false); setDictating(false); },
  };
}
