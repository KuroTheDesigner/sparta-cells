import type { Source } from '@/lib/ai/types';
import { safeUrl } from './api';

export function Sources({ sources = [] }: { sources?: Source[] }) {
  const links = sources.filter(source => safeUrl(source.url));
  if (!links.length) return null;
  return <details className="sc-assistant-sources"><summary>Sources ({links.length})</summary><ul>{links.map((source, index) => <li key={`${source.url}-${index}`}><a href={safeUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.title || new URL(source.url).hostname}</a></li>)}</ul></details>;
}

// Render a small, safe markdown subset without injecting model-generated HTML.
export function Answer({ text }: { text: string }) {
  return <div className="sc-assistant-answer">{text.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, position) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={position}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={position}>{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && safeUrl(link[2])) return <a key={position} href={safeUrl(link[2])} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return part;
  })}</p>)}</div>;
}
