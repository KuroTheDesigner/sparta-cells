'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Phone } from '@/lib/schema';
import type { ChatMessage, LocationResponse, RecommendationResponse, Source, StoreResponse, TextResponse } from '@/lib/ai/types';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useReviews } from '../../hooks/useReviews';
import { chatHistory, postAI, safeUrl } from './api';
import { Answer, Sources } from './Answer';
import './assistant.css';

export type AssistantPanelProps = { phones: Phone[]; currency?: string; onSearch: (query: string) => void };
type Message = ChatMessage & { sources?: Source[]; thinking?: boolean };
type RequestJob = { route: string; body: unknown; accept: (value: never) => void };

export function AssistantPanel({ phones, currency = 'NGN', onSearch }: AssistantPanelProps) {
  const id = useId();
  const [tab, setTab] = useState<'Chat' | 'Nearby' | 'Reviews'>('Chat');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [stores, setStores] = useState<StoreResponse | null>(null);
  const [reviewSummary, setReviewSummary] = useState<TextResponse | null>(null);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const lastJob = useRef<RequestJob | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(text => setInput(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 4000)));
  const live = useLiveSession();
  const reviews = useReviews();
  const phoneName = selectedPhone ?? phones[0]?.name ?? '';
  const phonesContext = JSON.stringify({ phones, currency });
  const previousContext = useRef({ phones: phonesContext, phoneName });
  const localReviews = reviews.getReviewsForPhone(phoneName);
  const liveRunning = live.status === 'active' || live.status === 'connecting';
  const recordingBusy = voice.recording || voice.dictating;

  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  useEffect(() => {
    if (previousContext.current.phones === phonesContext && previousContext.current.phoneName === phoneName) return;
    previousContext.current = { phones: phonesContext, phoneName };
    generation.current++;
    controller.current?.abort(); controller.current = null; lastJob.current = null;
    setBusy(''); setError(''); setRetry(false); setSaved(false);
    setRecommendation(null); setStores(null); setReviewSummary(null); setMessages([]);
    setNotice('Phone context changed. Previous answers and results were cleared; start a new conversation.');
  }, [phonesContext, phoneName]);
  useEffect(() => { if (live.summary) setVoiceSummary(live.summary.slice(0, 4000)); }, [live.summary]);
  useEffect(() => {
    const element = conversation.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  function cancel() {
    generation.current++; controller.current?.abort(); controller.current = null;
    setBusy(''); setError(''); setNotice('Request cancelled. You can retry when ready.'); setRetry(Boolean(lastJob.current));
  }
  async function execute(job: RequestJob) {
    controller.current?.abort();
    const requestId = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    lastJob.current = job; setBusy(job.route); setError(''); setNotice(''); setRetry(false);
    try {
      const result = await postAI<never>(job.route, job.body, abort.signal);
      if (requestId === generation.current) job.accept(result);
    } catch (cause) {
      if (requestId === generation.current && !abort.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Request failed. Please retry.'); setRetry(true); }
    } finally { if (requestId === generation.current) { controller.current = null; setBusy(''); } }
  }
  function request<T>(route: string, body: unknown, accept: (value: T) => void) {
    void execute({ route, body, accept: accept as (value: never) => void });
  }
  function send() {
    if (busy || recordingBusy || liveRunning || (!input.trim() && !voice.audio)) return;
    const content = input.trim().slice(0, 4000) || 'Please transcribe this audio and help me choose a phone.';
    const history = [...messages.map(({ role, content: text }) => ({ role, content: text })), { role: 'user' as const, content }];
    const audio = voice.audio;
    setMessages(history); setInput(''); voice.clearAudio();
    request<TextResponse>('chat', { messages: chatHistory(history), phones, currency, thinking, ...(audio ? { audio } : {}) }, result => setMessages([...history, { role: 'assistant', content: result.text, sources: result.sources, thinking }]));
  }
  function recommend() {
    if (!input.trim() || !phones.length || busy) return;
    request<RecommendationResponse>('recommendations', { priorities: input.trim(), phones, currency }, setRecommendation);
  }
  function findStores() {
    if (!phoneName.trim() || !location.trim()) return;
    request<StoreResponse>('stores', { phoneName: phoneName.trim(), location: location.trim() }, setStores);
  }
  async function useLocation() {
    if (!navigator.geolocation) { setError('Location is unavailable. Enter your city or area instead.'); return; }
    controller.current?.abort(); const requestId = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy('location'); setError(''); setNotice(''); setRetry(false); lastJob.current = null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 60000 }));
      if (requestId !== generation.current) return;
      const { latitude, longitude } = position.coords;
      // Country lookup is helpful context; store lookup can still use valid coordinates if it fails.
      const result = await postAI<LocationResponse>('location', { latitude, longitude }, abort.signal).catch(() => null);
      if (requestId !== generation.current) return;
      if (result?.country) setLocation(result.country);
      request<StoreResponse>('stores', { phoneName: phoneName.trim(), latitude, longitude }, setStores);
    } catch {
      if (requestId === generation.current) { setBusy(''); setError('Your location could not be used. Allow location access or enter your city or area and select Find stores.'); }
    }
  }
  function changePhone(value: string) { setSelectedPhone(value); }
  function switchTab(value: typeof tab) { if (busy) cancel(); voice.cancel(); live.endSession(); setTab(value); setError(''); setNotice(''); setRetry(false); }
  const disabled = Boolean(busy) || liveRunning || recordingBusy;
  const phoneField = <div className="sc-assistant-field"><label htmlFor={`${id}-phone`}>Phone model</label><input id={`${id}-phone`} list={`${id}-models`} value={phoneName} onChange={event => changePhone(event.target.value)} placeholder="Enter a phone model" maxLength={160} /><datalist id={`${id}-models`}>{phones.map(phone => <option key={phone.name} value={phone.name} />)}</datalist></div>;

  return <section className="sc-assistant" aria-label="Phone assistant">
    <header className="sc-assistant-header"><div><h2>Phone assistant</h2><p>Make a clearer choice with your comparison in context.</p></div><span className="sc-assistant-context">{phones.length} {phones.length === 1 ? 'phone' : 'phones'} in context</span></header>
    <div className="sc-assistant-tabs" role="tablist" aria-label="Assistant tools">{(['Chat', 'Nearby', 'Reviews'] as const).map((value, index, values) => <button key={value} id={`${id}-tab-${value}`} role="tab" type="button" aria-selected={tab === value} aria-controls={`${id}-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => switchTab(value)} onKeyDown={event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % values.length;
      else if (event.key === 'ArrowLeft') next = (index + values.length - 1) % values.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = values.length - 1;
      else return;
      event.preventDefault(); switchTab(values[next]); document.getElementById(`${id}-tab-${values[next]}`)?.focus();
    }}>{value}</button>)}</div>

    <div className="sc-assistant-body" id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`}>
      {tab === 'Chat' && <>
        <div ref={conversation} className="sc-assistant-conversation" role="log" aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions text">
          {!messages.length && <div className="sc-assistant-empty"><h3>What matters in your next phone?</h3><p>Ask about the phones in your comparison, explain a trade-off, or describe your priorities for a recommendation.</p><button type="button" className="sc-assistant-text-button" onClick={() => setInput('Which of these phones offers the best battery life, and what would I give up?')}>Ask about battery life</button></div>}
          {messages.map((message, index) => <article className={`sc-assistant-message sc-assistant-message-${message.role}`} key={index}><h4>{message.role === 'user' ? 'You' : 'Assistant'}{message.thinking && <span>Deep thinking</span>}</h4><Answer text={message.content} /><Sources sources={message.sources} /></article>)}
        </div>
        <form onSubmit={event => { event.preventDefault(); send(); }} className="sc-assistant-composer">
          <label htmlFor={`${id}-prompt`}>Your question or priorities</label>
          <textarea id={`${id}-prompt`} value={input} maxLength={4000} onChange={event => setInput(event.target.value)} placeholder="A reliable camera and long battery life, within my budget…" rows={3} disabled={Boolean(busy) || liveRunning} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); } }} />
          <div className="sc-assistant-options"><label className="sc-assistant-check"><input type="checkbox" checked={thinking} onChange={event => setThinking(event.target.checked)} disabled={disabled} />Deep thinking <span>for complex comparisons</span></label><span>Ctrl / ⌘ + Enter to send</span></div>
          <div className="sc-assistant-actions"><button className="sc-assistant-primary" type="submit" disabled={disabled || (!input.trim() && !voice.audio)}>Send question</button><button type="button" disabled={disabled || !input.trim() || !phones.length} onClick={recommend}>Recommend from these phones</button><button type="button" disabled={disabled || !input.trim()} onClick={() => onSearch(input.trim())}>Search these requirements</button></div>
          {!phones.length && <p className="sc-assistant-hint">Add phones to your comparison to get recommendations. You can still ask a question or search your requirements.</p>}
          <div className="sc-assistant-voice-tools"><button type="button" disabled={Boolean(busy) || liveRunning || voice.recording} onClick={() => voice.dictating ? voice.stopDictation() : voice.startDictation()}>{voice.dictating ? 'Stop dictation' : 'Dictate text'}</button><button type="button" disabled={Boolean(busy) || liveRunning || voice.dictating} onClick={() => voice.recording ? voice.stopRecording() : void voice.startRecording()}>{voice.recording ? 'Finish recording' : 'Record audio'}</button><label className="sc-assistant-file" aria-disabled={disabled}>Attach audio<input aria-label="Attach audio file" type="file" accept="audio/*" disabled={disabled} onChange={event => { const file = event.target.files?.[0]; if (file) void voice.attach(file); event.target.value = ''; }} /></label><button type="button" disabled={disabled} aria-expanded={voiceOpen} onClick={() => setVoiceOpen(!voiceOpen)}>Live conversation</button></div>
          <p className="sc-assistant-hint">Dictation may use your browser’s speech service. Recorded or attached audio is sent only when you select Send question. Recording stops after 60 seconds; audio limit 2.1 MB.</p>
          {(voice.recording || voice.dictating) && <p className="sc-assistant-info" role="status">{voice.recording ? 'Recording audio. Select Finish recording to attach it.' : 'Listening for dictation. Your words will appear above.'} <button type="button" onClick={voice.cancel}>Cancel microphone</button></p>}
          {voice.audio && <p className="sc-assistant-info" role="status">Audio attached. Add a question or send it for transcription and advice. <button type="button" onClick={voice.clearAudio}>Remove audio</button></p>}
          {voice.error && <p role="alert" className="sc-assistant-warning">{voice.error}</p>}
        </form>
        {voiceOpen && <section className="sc-assistant-live" aria-label="Live voice conversation"><h3>Talk through your priorities</h3><p>Your microphone streams to Google during this conversation. Stop at any time, or finish with a requirements summary.</p><div className="sc-assistant-actions">{!liveRunning ? <button type="button" className="sc-assistant-primary" disabled={disabled} onClick={() => { voice.cancel(); setVoiceSummary(''); void live.startSession(); }}>{live.status === 'error' || live.status === 'ended' ? 'Start a new conversation' : 'Start voice conversation'}</button> : <><button type="button" onClick={live.endSession}>Stop conversation</button><button type="button" className="sc-assistant-primary" disabled={live.status !== 'active' || live.summarizing} onClick={live.requestSummary}>{live.summarizing ? 'Preparing summary…' : 'Finish and summarize'}</button></>}</div><p role="status" className="sc-assistant-hint">{live.status === 'connecting' ? 'Connecting microphone and voice service…' : live.status === 'active' ? live.summarizing ? 'Microphone stopped. Preparing your summary…' : 'Microphone is live. Speak naturally.' : live.status === 'ended' ? 'Conversation ended. Microphone is off.' : 'Microphone is off.'}</p>{live.error && <p className="sc-assistant-warning" role="alert">{live.error}</p>}{live.transcript.length > 0 && <div className="sc-assistant-transcript" role="log" aria-label="Live transcript" aria-live="polite">{live.transcript.map((entry, index) => <p key={index}><strong>{entry.speaker === 'user' ? 'You' : 'Assistant'}:</strong> {entry.text}</p>)}</div>}{live.transcript.length > 0 && !liveRunning && <button type="button" className="sc-assistant-text-button" onClick={() => { setVoiceSummary(live.transcript.filter(entry => entry.speaker === 'user').map(entry => entry.text).join(' ').slice(0, 4000)); }}>Use my spoken requirements</button>}{voiceSummary && <div className="sc-assistant-field"><label htmlFor={`${id}-summary`}>Requirements summary — edit before searching</label><textarea id={`${id}-summary`} rows={4} maxLength={4000} value={voiceSummary} onChange={event => setVoiceSummary(event.target.value)} /><div className="sc-assistant-actions"><button type="button" className="sc-assistant-primary" disabled={!voiceSummary.trim() || liveRunning} onClick={() => onSearch(voiceSummary.trim())}>Search these requirements</button><button type="button" onClick={() => setInput(voiceSummary)}>Use in chat</button></div></div>}</section>}
        {recommendation && <section className="sc-assistant-results" aria-label="Phone recommendations"><h3>Recommended for your priorities</h3>{!recommendation.primary && <p>No recommendation could be made from these phones. Try adjusting your priorities.</p>}{[recommendation.primary, recommendation.runnerUp].map((item, index) => item && <article key={`${item.name}-${index}`}><p className="sc-assistant-hint">{index === 0 ? 'Best fit' : 'Alternative'}</p><h4>{item.name}</h4><Answer text={item.justification} /><button type="button" onClick={() => { changePhone(item.name); switchTab('Nearby'); }}>Find this phone nearby</button></article>)}<Sources sources={recommendation.sources} /></section>}
      </>}

      {tab === 'Nearby' && <><h3>Find a place to buy</h3><p>Search a city or area, or share your current location for this request.</p><form onSubmit={event => { event.preventDefault(); findStores(); }}>{phoneField}<div className="sc-assistant-field"><label htmlFor={`${id}-location`}>City or area</label><input id={`${id}-location`} value={location} onChange={event => setLocation(event.target.value)} placeholder="e.g. Ikeja, Lagos" disabled={Boolean(busy)} maxLength={160} /></div><div className="sc-assistant-actions"><button className="sc-assistant-primary" type="submit" disabled={Boolean(busy) || !phoneName.trim() || !location.trim()}>Find stores</button><button type="button" onClick={() => void useLocation()} disabled={Boolean(busy) || !phoneName.trim()}>Use my location</button></div></form>{stores && <section className="sc-assistant-results" aria-label="Store results"><h3>{stores.stores.length ? 'Stores to check' : 'No stores found'}</h3><p>{stores.message || 'Contact the store to confirm stock and current pricing before travelling.'}</p>{stores.stores.map((store, index) => <article key={`${store.placeId}-${index}`}><h4>{store.name}</h4><dl><div><dt>Price</dt><dd>{store.price || 'Not confirmed'}</dd></div><div><dt>Phone</dt><dd>{store.phoneNumber || 'Not available'}</dd></div></dl>{safeUrl(store.mapsUrl) && <a href={safeUrl(store.mapsUrl)} target="_blank" rel="noopener noreferrer">Open in Maps</a>}<Sources sources={store.sources} /></article>)}<Sources sources={stores.sources} /><p className="sc-assistant-warning">Listings and prices can change. Confirm the exact model, availability, and warranty with the seller.</p></section>}</>}

      {tab === 'Reviews' && <><h3>Research the real-world trade-offs</h3><p>Read a sourced review overview, or keep your own experience on this browser.</p>{phoneField}<div className="sc-assistant-actions"><button type="button" className="sc-assistant-primary" disabled={Boolean(busy) || !phoneName.trim()} onClick={() => request<TextResponse>('reviews', { phoneName }, setReviewSummary)}>Research online reviews</button><button type="button" disabled={Boolean(busy) || !localReviews.length} onClick={() => request<TextResponse>('reviews', { phoneName, reviews: localReviews.slice(-100).map(review => ({ ...review, author: review.author.slice(0, 160) || 'Anonymous', comment: review.comment.slice(0, 4000) })) }, setReviewSummary)}>Summarize saved reviews</button></div>{reviewSummary && <section className="sc-assistant-results"><h3>Review overview</h3><Answer text={reviewSummary.text} /><Sources sources={reviewSummary.sources} />{!reviewSummary.sources?.length && <p className="sc-assistant-hint">No external source links were returned with this overview.</p>}</section>}<section className="sc-assistant-results"><h3>Saved on this browser</h3>{localReviews.length ? <><p>{reviews.getAverageRatingForPhone(phoneName).toFixed(1)} / 5 · {localReviews.length} {localReviews.length === 1 ? 'review' : 'reviews'}</p>{localReviews.map((review, index) => <article key={index}><h4>{review.author} <span className="sc-assistant-hint">{review.rating} / 5</span></h4><p>{review.comment}</p></article>)}</> : <p>No saved reviews for this phone.</p>}<form onSubmit={event => { event.preventDefault(); if (reviews.addReview(phoneName, { author, rating, comment })) { setComment(''); setSaved(true); } }}><h4>Add your experience</h4><div className="sc-assistant-field"><label htmlFor={`${id}-author`}>Name (optional)</label><input id={`${id}-author`} value={author} onChange={event => setAuthor(event.target.value)} placeholder="Anonymous" maxLength={100} /></div><div className="sc-assistant-field"><label htmlFor={`${id}-rating`}>Rating</label><select id={`${id}-rating`} value={rating} onChange={event => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></div><div className="sc-assistant-field"><label htmlFor={`${id}-review`}>Your review</label><textarea id={`${id}-review`} rows={3} value={comment} onChange={event => { setComment(event.target.value); setSaved(false); }} maxLength={4000} required /></div><button className="sc-assistant-primary" type="submit" disabled={!phoneName.trim() || !comment.trim()}>Save review on this browser</button><p className="sc-assistant-hint">Reviews stay on this device. Selecting Summarize saved reviews sends them to the assistant.</p>{saved && <p className="sc-assistant-info" role="status">Review saved for {phoneName}.</p>}{reviews.storageError && <p className="sc-assistant-warning" role="status">{reviews.storageError}</p>}</form></section></>}
    </div>
    {(busy || error || notice) && <footer className="sc-assistant-status" aria-live="polite">{busy && <div role="status"><span>{busy === 'chat' ? thinking ? 'Thinking through your comparison…' : 'Preparing an answer…' : busy === 'stores' ? 'Looking for stores and sources…' : busy === 'location' ? 'Finding your location…' : busy === 'reviews' ? 'Preparing the review overview…' : 'Comparing your priorities…'}</span><button type="button" onClick={cancel}>Cancel request</button></div>}{error && <p className="sc-assistant-warning" role="alert">{error}</p>}{notice && <p>{notice}</p>}{retry && lastJob.current && <button type="button" onClick={() => lastJob.current && void execute(lastJob.current)}>Retry request</button>}</footer>}
  </section>;
}

export default AssistantPanel;
