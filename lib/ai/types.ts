import type { Phone } from '../schema';
import type { SerializedFilterState } from '../filters';

// Public contracts only. Never import the server modules from a client component.
export type Source = { title: string; url: string };
export type SearchStatus = 'complete' | 'partial' | 'shortage' | 'unverified';
export type PhoneEvidence = {
  name: string;
  currency: string | null;
  sources: Source[];
  notes: string;
  fieldSources?: Record<string, Source[]>;
  unknownFields?: string[];
  imageUrl: string | null;
  imageSource: Source | null;
};
export type SearchRequest = {
  description: string;
  country: string;
  currency: string;
  filters?: SerializedFilterState;
};
export type SearchResponse = {
  phones: Phone[];
  evidence: PhoneEvidence[];
  sources: Source[];
  status: SearchStatus;
  requestedCount: number;
  message: string;
  constraintsRelaxed: false;
};
export type Recommendation = { name: string; justification: string; imageUrl: string | null; imageSource: Source | null };
export type RecommendationRequest = { priorities: string; phones: Phone[]; currency?: string };
export type RecommendationResponse = { primary: Recommendation | null; runnerUp: Recommendation | null; sources: Source[] };
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ChatRequest = { messages: ChatMessage[]; phones: Phone[]; currency?: string; thinking?: boolean; audio?: { data: string; mimeType: string } };
export type TextResponse = { text: string; sources: Source[] };
export type StoreRequest = { phoneName: string; latitude?: number; longitude?: number; location?: string };
export type StoreDetails = { name: string; mapsUrl: string; price: string | null; phoneNumber: string | null; placeId: string; sources: Source[] };
export type StoreResponse = { stores: StoreDetails[]; sources: Source[]; message: string };
export type LocationRequest = { latitude: number; longitude: number };
export type LocationResponse = { country: string | null; sources: Source[] };
export type Review = { author: string; rating: number; comment: string };
export type ReviewSummaryRequest = { phoneName: string; reviews?: Review[] };
export type LiveTokenResponse = { token: string; model: string; apiVersion: 'v1beta'; expireTime: string; newSessionExpireTime: string; config: { responseModalities: ['AUDIO']; inputAudioTranscription: Record<string, never>; outputAudioTranscription: Record<string, never> } };
export type ApiError = { error: { code: string; message: string } };
